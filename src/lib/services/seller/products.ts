import 'server-only';
import { and, eq, inArray, notInArray, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema } from '@/lib/db';
import { AppError } from '@/lib/errors';
import { LIMITS } from '@/lib/config';
import { audit } from '@/lib/security';
import { notify } from '@/lib/notifications';
import { filesFrom, saveImage } from '@/lib/storage';
import { parseMoney, slugify } from '@/lib/utils';
import type { ProductStatus } from './queries';

const { products: p, productImages, productVariants: v, inventoryMovements, categories } = schema;

type Seller = { userId: string; storeId: string };
const MAX_CENTS = 100_000_000; // $1,000,000

const text = (max: number, label: string) => z.string().trim().max(max, `${label}: máximo ${max} caracteres`);
const optMoney = z.string().trim().transform((s) => (s === '' ? null : parseMoney(s)))
  .refine((n) => n === null || (Number.isFinite(n) && n > 0 && n <= MAX_CENTS), 'Revisa los montos: usa números como 1299.50');
const optInt = (max: number, label: string) => z.string().trim().transform((s) => (s === '' ? null : Number(s)))
  .refine((n) => n === null || (Number.isInteger(n) && n >= 0 && n <= max), `${label} inválido`);

const productSchema = z.object({
  title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(140, 'El título admite máximo 140 caracteres'),
  description: text(5000, 'Descripción'),
  price: z.string().trim().transform(parseMoney).refine((n) => Number.isFinite(n) && n >= 100 && n <= MAX_CENTS, 'Escribe un precio válido (mínimo $1)'),
  salePrice: optMoney,
  categoryId: z.coerce.number().int('Elige una categoría').positive('Elige una categoría'),
  brand: text(60, 'Marca'),
  sku: text(60, 'SKU'),
  condition: z.enum(['new', 'used', 'refurbished'], 'Elige la condición'),
  weightGrams: optInt(1_000_000, 'Peso'),
  lengthCm: optInt(1000, 'Largo'),
  widthCm: optInt(1000, 'Ancho'),
  heightCm: optInt(1000, 'Alto'),
  shippingInfo: text(500, 'Información de envío'),
}).refine((d) => d.salePrice == null || d.salePrice < d.price, 'El precio de oferta debe ser menor al precio normal');

const variantSchema = z.object({
  id: z.union([z.uuid(), z.literal('')]),
  name: z.string().trim().min(1, 'Cada variante necesita un nombre').max(60, 'Nombre de variante: máximo 60 caracteres'),
  sku: text(60, 'SKU de variante'),
  price: optMoney,
  stock: z.string().trim().transform(Number).refine((n) => Number.isInteger(n) && n >= 0 && n <= 100_000, 'Existencias inválidas (0 a 100,000)'),
});

const first = <T>(r: z.ZodSafeParseResult<T>) => {
  if (!r.success) throw new AppError(r.error.issues[0].message);
  return r.data;
};

function parseForm(fd: FormData) {
  const s = (k: string) => String(fd.get(k) ?? '');
  const data = first(productSchema.safeParse(Object.fromEntries(
    ['title', 'description', 'price', 'salePrice', 'categoryId', 'brand', 'sku', 'condition', 'weightGrams', 'lengthCm', 'widthCm', 'heightCm', 'shippingInfo'].map((k) => [k, s(k)]),
  )));
  const col = (k: string) => fd.getAll(k).map(String);
  const ids = col('variantId'), names = col('variantName'), skus = col('variantSku'), prices = col('variantPrice'), stocks = col('variantStock');
  if (!names.length) throw new AppError('Agrega al menos una variante (por ejemplo "Único")');
  if (names.length > LIMITS.variants) throw new AppError(`Máximo ${LIMITS.variants} variantes`);
  const variants = names.map((name, i) => first(variantSchema.safeParse({ id: ids[i] ?? '', name, sku: skus[i] ?? '', price: prices[i] ?? '', stock: stocks[i] ?? '' })));
  if (new Set(variants.map((x) => x.name.toLowerCase())).size !== variants.length) throw new AppError('Hay variantes con el mismo nombre');
  const keep = col('keepImage');
  if (!keep.every((id) => z.uuid().safeParse(id).success)) throw new AppError('Imagen no válida');
  const intent = s('intent');
  return { data, variants, keep, intent: intent === 'publish' || intent === 'keep' ? intent : 'draft' as const };
}

async function uniqueSlug(title: string) {
  const base = slugify(title).slice(0, 60) || 'producto';
  for (let i = 0; i < 5; i++) {
    const slug = `${base}-${Math.random().toString(36).slice(2, 7)}`;
    const [taken] = await db.select({ id: p.id }).from(p).where(eq(p.slug, slug)).limit(1);
    if (!taken) return slug;
  }
  throw new AppError('No pudimos generar la dirección del producto. Intenta de nuevo.');
}

/**
 * Crea o edita un producto con sus imágenes y variantes, todo validado en el servidor.
 * Los cambios de existencias quedan en inventory_movements ('initial' al crear la variante, 'adjust' al editar).
 */
export async function saveProduct(seller: Seller, productId: string | null, fd: FormData) {
  const { data, variants, keep, intent } = parseForm(fd);

  const existing = productId ? await db.query.products.findFirst({
    where: and(eq(p.id, productId), eq(p.storeId, seller.storeId)),
    with: { images: { columns: { id: true } }, variants: { columns: { id: true } } },
  }) : null;
  if (productId && !existing) throw new AppError('Producto no encontrado');
  const imageIds = new Set(existing?.images.map((i) => i.id));
  const variantIds = new Set(existing?.variants.map((x) => x.id));
  if (!keep.every((id) => imageIds.has(id))) throw new AppError('Imagen no válida');
  if (!variants.every((x) => !x.id || variantIds.has(x.id))) throw new AppError('Variante no válida. Recarga la página.');

  const [cat] = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.active, true)));
  if (!cat) throw new AppError('Elige una categoría válida');

  const prev = existing?.status ?? null;
  // Un producto suspendido por moderación conserva su estado; el vendedor puede corregirlo, no publicarlo.
  const status: ProductStatus = prev === 'suspended' ? 'suspended' : intent === 'publish' ? 'active' : intent === 'keep' && prev ? prev : 'draft';

  const files = filesFrom(fd, 'images', LIMITS.productImages);
  if (keep.length + files.length > LIMITS.productImages) throw new AppError(`Máximo ${LIMITS.productImages} imágenes por producto`);
  if (status === 'active' && keep.length + files.length === 0) throw new AppError('Agrega al menos una imagen para publicar');

  // Las imágenes se procesan después de verificar todo lo anterior (no gastamos CPU en solicitudes inválidas).
  const saved: Awaited<ReturnType<typeof saveImage>>[] = [];
  for (const f of files) saved.push(await saveImage(f, 'products'));
  const slug = existing?.slug ?? (await uniqueSlug(data.title));

  const values = {
    ...data, brand: data.brand || null, sku: data.sku || null, shippingInfo: data.shippingInfo || null, status,
    publishedAt: status === 'active' ? existing?.publishedAt ?? new Date() : existing?.publishedAt ?? null,
  };
  const outOfStock: string[] = [];

  const id = await db.transaction(async (tx) => {
    let id = productId;
    if (id) {
      await tx.update(p).set(values).where(and(eq(p.id, id), eq(p.storeId, seller.storeId)));
      await tx.delete(productImages).where(and(eq(productImages.productId, id), keep.length ? notInArray(productImages.id, keep) : undefined));
      for (const [i, imageId] of keep.entries()) {
        await tx.update(productImages).set({ position: i }).where(and(eq(productImages.id, imageId), eq(productImages.productId, id)));
      }
    } else {
      [{ id }] = await tx.insert(p).values({ ...values, storeId: seller.storeId, slug }).returning({ id: p.id });
    }
    const pid = id!;
    if (saved.length) {
      await tx.insert(productImages).values(saved.map((im, i) => ({ productId: pid, url: im.url, thumbUrl: im.thumbUrl, width: im.width, height: im.height, alt: data.title, position: keep.length + i })));
    }

    const current = new Map((await tx.select({ id: v.id, stock: v.stock }).from(v).where(eq(v.productId, pid)).for('update')).map((r) => [r.id, r.stock]));
    const submitted = variants.filter((x) => x.id).map((x) => x.id);
    // order_items.variant_id es ON DELETE SET NULL: borrar variantes no rompe el historial de pedidos.
    await tx.delete(v).where(and(eq(v.productId, pid), submitted.length ? notInArray(v.id, submitted) : undefined));
    for (const [i, x] of variants.entries()) {
      const row = { name: x.name, sku: x.sku || null, priceOverride: x.price, stock: x.stock, position: i };
      if (x.id) {
        await tx.update(v).set(row).where(and(eq(v.id, x.id), eq(v.productId, pid)));
        const delta = x.stock - (current.get(x.id) ?? 0);
        if (delta) await tx.insert(inventoryMovements).values({ variantId: x.id, delta, reason: 'adjust', actorId: seller.userId });
        if (delta && x.stock === 0) outOfStock.push(x.name);
      } else {
        const [created] = await tx.insert(v).values({ ...row, productId: pid }).returning({ id: v.id });
        if (x.stock) await tx.insert(inventoryMovements).values({ variantId: created.id, delta: x.stock, reason: 'initial', actorId: seller.userId });
      }
    }
    return pid;
  });

  await audit(seller.userId, productId ? 'product.updated' : 'product.created', 'product', id, { status, previousStatus: prev, images: keep.length + saved.length, variants: variants.length });
  if (outOfStock.length && status === 'active') {
    await notify(seller.userId, { type: 'out_of_stock', title: `Sin existencias: ${data.title}`, body: `Variantes agotadas: ${outOfStock.join(', ')}.`, link: '/vendedor/inventario?filtro=agotados' });
  }
  return { id, slug, status };
}

/** Cambios de estado permitidos al vendedor. "archived" es el borrado lógico. */
const TRANSITIONS: Partial<Record<ProductStatus, ProductStatus[]>> = {
  draft: ['active', 'archived'],
  active: ['paused', 'archived', 'draft'],
  paused: ['active', 'archived'],
  archived: ['draft'],
};

export async function setProductStatus(seller: Seller, productId: string, to: ProductStatus) {
  const [prod] = await db.select({
    id: p.id, status: p.status, slug: p.slug, publishedAt: p.publishedAt,
    images: sql<number>`(select count(*)::int from ${productImages} where ${productImages.productId} = "products"."id")`,
    variants: sql<number>`(select count(*)::int from ${v} where ${v.productId} = "products"."id")`,
  }).from(p).where(and(eq(p.id, productId), eq(p.storeId, seller.storeId)));
  if (!prod) throw new AppError('Producto no encontrado');
  if (prod.status === 'suspended') throw new AppError('Este producto está suspendido por moderación. Corrígelo y contacta a soporte.');
  if (!TRANSITIONS[prod.status]?.includes(to)) throw new AppError('Cambio de estado no permitido');
  if (to === 'active' && (!prod.images || !prod.variants)) throw new AppError('Para publicar necesitas al menos una imagen y una variante. Edita el producto.');
  await db.update(p).set({ status: to, publishedAt: to === 'active' ? prod.publishedAt ?? new Date() : prod.publishedAt })
    .where(and(eq(p.id, productId), eq(p.storeId, seller.storeId)));
  await audit(seller.userId, 'product.status', 'product', productId, { from: prod.status, to });
  return prod.slug;
}

/** Ajuste absoluto de existencias de una variante (inventario). Registra el movimiento y avisa si se agota. */
export async function setVariantStock(seller: Seller, variantId: string, stock: number) {
  if (!Number.isInteger(stock) || stock < 0 || stock > 100_000) throw new AppError('Escribe una cantidad entre 0 y 100,000');
  const r = await db.transaction(async (tx) => {
    const [row] = await tx.select({ stock: v.stock, name: v.name, title: p.title })
      .from(v).innerJoin(p, eq(p.id, v.productId))
      .where(and(eq(v.id, variantId), eq(p.storeId, seller.storeId), inArray(p.status, ['draft', 'active', 'paused', 'suspended']))).for('update');
    if (!row) throw new AppError('Variante no encontrada');
    const delta = stock - row.stock;
    if (delta) {
      await tx.update(v).set({ stock }).where(eq(v.id, variantId));
      await tx.insert(inventoryMovements).values({ variantId, delta, reason: 'adjust', actorId: seller.userId });
    }
    return { ...row, delta };
  });
  if (r.delta) await audit(seller.userId, 'inventory.adjust', 'product_variant', variantId, { from: r.stock, to: stock });
  if (r.delta && stock === 0) {
    await notify(seller.userId, { type: 'out_of_stock', title: `Sin existencias: ${r.title}`, body: `La variante "${r.name}" se quedó en 0 piezas.`, link: '/vendedor/inventario?filtro=agotados' });
  }
  return r.delta;
}
