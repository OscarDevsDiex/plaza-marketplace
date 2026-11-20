import { AppError } from '@/lib/errors';
import 'server-only';
import { cookies } from 'next/headers';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import type { DB } from '@/lib/db/client';
import { randomToken, sha256 } from '@/lib/crypto';
import { IS_PROD, LIMITS } from '@/lib/config';
import { getCurrentUser } from '@/lib/auth/session';
import { storeTotals, unitPrice, type CouponRule } from './pricing';

const { carts, cartItems, productVariants: v, products: p, stores: s, productImages, coupons } = schema;
const GUEST_COOKIE = IS_PROD ? '__Host-plaza_cart' : 'plaza_cart';

export class CartError extends AppError {}

/** Carrito del usuario (o del invitado por cookie). Solo crea uno si `create` es true. */
async function cartId(create: boolean): Promise<string | null> {
  const user = await getCurrentUser();
  if (user) {
    const [c] = await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (c || !create) return c?.id ?? null;
    const [n] = await db.insert(carts).values({ userId: user.id }).onConflictDoNothing().returning({ id: carts.id });
    return n?.id ?? (await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, user.id)))[0].id;
  }
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (token) {
    const [c] = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestTokenHash, sha256(token))).limit(1);
    if (c) return c.id;
  }
  if (!create) return null;
  const fresh = randomToken(24);
  const [n] = await db.insert(carts).values({ guestTokenHash: sha256(fresh) }).returning({ id: carts.id });
  jar.set(GUEST_COOKIE, fresh, { httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30 });
  return n.id;
}

/** Al iniciar sesión, los artículos del carrito de invitado pasan al carrito del usuario. */
export async function mergeGuestCart(userId: string) {
  const jar = await cookies();
  const token = jar.get(GUEST_COOKIE)?.value;
  if (!token) return;
  const [guest] = await db.select({ id: carts.id }).from(carts).where(eq(carts.guestTokenHash, sha256(token))).limit(1);
  jar.delete(GUEST_COOKIE);
  if (!guest) return;
  await db.transaction(async (tx) => {
    await tx.insert(carts).values({ userId }).onConflictDoNothing();
    const [userCart] = await tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, userId));
    const items = await tx.select().from(cartItems).where(eq(cartItems.cartId, guest.id));
    for (const it of items) {
      await tx.insert(cartItems).values({ cartId: userCart.id, variantId: it.variantId, quantity: it.quantity })
        .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], set: { quantity: sql`least(${cartItems.quantity} + ${it.quantity}, ${LIMITS.cartQty})` } });
    }
    await tx.delete(carts).where(eq(carts.id, guest.id));
  });
}

export async function addToCart(variantId: string, quantity: number) {
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > LIMITS.cartQty) throw new CartError('Cantidad inválida');
  const [row] = await db.select({ stock: v.stock, status: p.status, storeStatus: s.status, ownerId: s.ownerId })
    .from(v).innerJoin(p, eq(p.id, v.productId)).innerJoin(s, eq(s.id, p.storeId)).where(eq(v.id, variantId)).limit(1);
  if (!row || row.status !== 'active' || row.storeStatus !== 'active') throw new CartError('Este producto ya no está disponible');
  const user = await getCurrentUser();
  if (user && row.ownerId === user.id) throw new CartError('No puedes comprar productos de tu propia tienda');
  const id = (await cartId(true))!;
  const [current] = await db.select({ q: cartItems.quantity }).from(cartItems).where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, variantId)));
  const next = (current?.q ?? 0) + quantity;
  if (next > row.stock) throw new CartError(row.stock ? `Solo hay ${row.stock} disponibles` : 'Producto agotado');
  await db.insert(cartItems).values({ cartId: id, variantId, quantity: next })
    .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.variantId], set: { quantity: next } });
}

export async function setCartQuantity(variantId: string, quantity: number) {
  const id = await cartId(false);
  if (!id) return;
  if (quantity <= 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, variantId)));
    return;
  }
  const [row] = await db.select({ stock: v.stock }).from(v).where(eq(v.id, variantId));
  if (!row) throw new CartError('Producto no disponible');
  await db.update(cartItems).set({ quantity: Math.min(quantity, row.stock, LIMITS.cartQty) })
    .where(and(eq(cartItems.cartId, id), eq(cartItems.variantId, variantId)));
}

export async function cartCount() {
  const id = await cartId(false);
  if (!id) return 0;
  const [r] = await db.select({ n: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` }).from(cartItems).where(eq(cartItems.cartId, id));
  return r.n;
}

export type CartLine = {
  variantId: string; productId: string; slug: string; title: string; variantName: string; image: string | null;
  categoryId: number; unitPrice: number; listPrice: number; quantity: number; stock: number; available: boolean; problem: string | null;
};
export type CartGroup = {
  store: { id: string; name: string; slug: string; ownerId: string };
  lines: CartLine[]; subtotal: number; discount: number; shipping: number; total: number;
  coupon: { code: string; problem: string | null } | null; freeShippingOver: number | null;
};

/**
 * Lee las líneas del carrito con precios y existencias actuales, agrupadas por tienda.
 * `couponCodes` es { storeId: código }. Lo usan la página del carrito y el checkout.
 */
export async function loadCart(couponCodes: Record<string, string> = {}, opts: { cartId?: string; tx?: Pick<DB, 'select'> } = {}) {
  const q = opts.tx ?? db; // dentro de una transacción hay que usar su conexión
  const id = opts.cartId ?? (await cartId(false));
  if (!id) return { cartId: null, groups: [] as CartGroup[], totals: { subtotal: 0, discount: 0, shipping: 0, total: 0, items: 0 }, hasProblems: false };
  const rows = await q.select({
    variantId: v.id, variantName: v.name, stock: v.stock, priceOverride: v.priceOverride, quantity: cartItems.quantity,
    productId: p.id, slug: p.slug, title: p.title, price: p.price, salePrice: p.salePrice, status: p.status, categoryId: p.categoryId,
    storeId: s.id, storeName: s.name, storeSlug: s.slug, storeStatus: s.status, ownerId: s.ownerId,
    shippingFlat: s.shippingFlat, freeShippingOver: s.freeShippingOver,
    image: sql<string | null>`(select coalesce(${productImages.thumbUrl}, ${productImages.url}) from ${productImages} where ${productImages.productId} = "products"."id" order by ${productImages.position} limit 1)`,
  }).from(cartItems).innerJoin(v, eq(v.id, cartItems.variantId)).innerJoin(p, eq(p.id, v.productId)).innerJoin(s, eq(s.id, p.storeId))
    .where(eq(cartItems.cartId, id)).orderBy(s.name, cartItems.createdAt);

  const storeIds = [...new Set(rows.map((r) => r.storeId))];
  const codes = Object.entries(couponCodes).filter(([sid, c]) => storeIds.includes(sid) && c.trim());
  const couponRows = codes.length
    ? await q.select().from(coupons).where(and(inArray(coupons.storeId, codes.map(([sid]) => sid)), inArray(sql`upper(${coupons.code})`, codes.map(([, c]) => c.trim().toUpperCase()))))
    : [];

  const groups = new Map<string, CartGroup>();
  for (const r of rows) {
    const available = r.status === 'active' && r.storeStatus === 'active';
    const problem = !available ? 'Ya no está disponible' : r.stock === 0 ? 'Agotado' : r.quantity > r.stock ? `Solo quedan ${r.stock}` : null;
    const g = groups.get(r.storeId) ?? {
      store: { id: r.storeId, name: r.storeName, slug: r.storeSlug, ownerId: r.ownerId }, lines: [], subtotal: 0, discount: 0, shipping: 0, total: 0,
      coupon: null, freeShippingOver: r.freeShippingOver,
    };
    g.lines.push({
      variantId: r.variantId, productId: r.productId, slug: r.slug, title: r.title, variantName: r.variantName, image: r.image, categoryId: r.categoryId,
      unitPrice: unitPrice(r.price, r.salePrice, r.priceOverride), listPrice: r.priceOverride ?? r.price, quantity: r.quantity, stock: r.stock, available, problem,
    });
    groups.set(r.storeId, g);
  }
  for (const g of groups.values()) {
    const row = rows.find((r) => r.storeId === g.store.id)!;
    const code = couponCodes[g.store.id]?.trim();
    const coupon = code ? (couponRows.find((c) => c.storeId === g.store.id && c.code.toUpperCase() === code.toUpperCase()) as CouponRule | undefined) : undefined;
    const t = storeTotals(g.lines.filter((l) => !l.problem), row, code ? (coupon ?? { id: '', code, type: 'fixed', value: 0, minSubtotal: 0, maxUses: 0, uses: 1, startsAt: null, endsAt: null, active: false }) : null);
    Object.assign(g, { subtotal: t.subtotal, discount: t.discount, shipping: t.shipping, total: t.total, coupon: code ? { code: code.toUpperCase(), problem: t.couponProblem } : null });
  }
  const list = [...groups.values()];
  return {
    cartId: id,
    groups: list,
    totals: {
      subtotal: list.reduce((t, g) => t + g.subtotal, 0), discount: list.reduce((t, g) => t + g.discount, 0),
      shipping: list.reduce((t, g) => t + g.shipping, 0), total: list.reduce((t, g) => t + g.total, 0),
      items: list.reduce((t, g) => t + g.lines.reduce((a, l) => a + l.quantity, 0), 0),
    },
    hasProblems: list.some((g) => g.lines.some((l) => l.problem)),
  };
}
