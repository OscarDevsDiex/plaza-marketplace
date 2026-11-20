import 'server-only';
import { and, asc, desc, eq, ilike, inArray, isNull, ne, or, sql, type SQL } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowsOf } from '@/lib/db/client';

/**
 * Consultas del panel de vendedor. TODAS reciben el storeId de la sesión (requireSeller) y filtran por él.
 */
const { sellerOrders: so, orders, orderItems, products: p, productImages, productVariants: v, categories, reviews, reviewResponses,
  users, coupons, stores, sellerProfiles, platformCommissions } = schema;

export const PAGE_SIZE = 20;
export const TZ = 'America/Mexico_City';
/** Sub-pedidos que cuentan como venta. */
export const SOLD = ['paid', 'processing', 'shipped', 'delivered'] as const;
const sold = inArray(so.status, [...SOLD]);

export type ProductStatus = (typeof schema.productStatus.enumValues)[number];
export type SellerOrderStatus = (typeof schema.sellerOrderStatus.enumValues)[number];

const stockSum = sql<number>`(select coalesce(sum(${v.stock}), 0)::int from ${v} where ${v.productId} = "products"."id")`;
const firstImage = sql<string | null>`(select coalesce(${productImages.thumbUrl}, ${productImages.url}) from ${productImages} where ${productImages.productId} = "products"."id" order by ${productImages.position} limit 1)`;
const num = (s: SQL) => s.mapWith(Number);
const since = (days: number) => sql`${so.createdAt} >= now() - make_interval(days => ${days})`;
/** Escapa comodines de LIKE para que "%" o "_" del usuario se busquen literalmente. */
const like = (q: string) => `%${q.replace(/[\\%_]/g, '\\$&')}%`;

const dayFmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Ventas por día (zona horaria de México), rellenando días sin ventas con cero. */
export async function dailySales(storeId: string, days: number) {
  const res = await db.execute(sql`
    select to_char(d, 'YYYY-MM-DD') as day, coalesce(sum(so.total), 0)::bigint as value
    from generate_series((now() at time zone ${TZ})::date - ${days - 1}::int, (now() at time zone ${TZ})::date, interval '1 day') d
    left join seller_orders so on so.store_id = ${storeId}
      and so.status in ('paid', 'processing', 'shipped', 'delivered')
      and (so.created_at at time zone ${TZ})::date = d::date
    group by d order by d`);
  return rowsOf<{ day: string; value: string | number }>(res).map((r) => ({ label: dayFmt.format(new Date(`${r.day}T00:00:00Z`)), value: Number(r.value) }));
}

function topProducts(storeId: string, days?: number, limit = 5) {
  return db.select({ label: orderItems.title, value: num(sql`sum(${orderItems.lineTotal})`), units: num(sql`sum(${orderItems.quantity})`) })
    .from(orderItems).innerJoin(so, eq(so.id, orderItems.sellerOrderId))
    .where(and(eq(so.storeId, storeId), sold, days ? since(days) : undefined))
    .groupBy(orderItems.title).orderBy(desc(sql`sum(${orderItems.lineTotal})`)).limit(limit);
}

const orderRow = {
  id: so.id, number: orders.number, buyerName: orders.buyerName, createdAt: so.createdAt, status: so.status, total: so.total,
  items: sql<number>`(select coalesce(sum(${orderItems.quantity}), 0)::int from ${orderItems} where ${orderItems.sellerOrderId} = "seller_orders"."id")`,
};

export async function getDashboard(storeId: string) {
  const [[k], [prod], series, top, latest, rating] = await Promise.all([
    db.select({
      sales: num(sql`coalesce(sum(${so.total}) filter (where ${sold}), 0)`),
      net: num(sql`coalesce(sum(${so.sellerNet}) filter (where ${sold}), 0)`),
      commission: num(sql`coalesce(sum(${so.commissionAmount}) filter (where ${sold}), 0)`),
      held: num(sql`coalesce(sum(${so.sellerNet}) filter (where ${sold} and ${so.payoutStatus} in ('held', 'eligible')), 0)`),
      toPrepare: num(sql`count(*) filter (where ${so.status} in ('paid', 'processing'))`),
      shipped: num(sql`count(*) filter (where ${so.status} = 'shipped')`),
    }).from(so).where(eq(so.storeId, storeId)),
    db.select({
      active: num(sql`count(*) filter (where ${p.status} = 'active')`),
      outOfStock: num(sql`count(*) filter (where ${p.status} = 'active' and ${stockSum} = 0)`),
    }).from(p).where(eq(p.storeId, storeId)),
    dailySales(storeId, 30),
    topProducts(storeId),
    db.select(orderRow).from(so).innerJoin(orders, eq(orders.id, so.orderId))
      .where(and(eq(so.storeId, storeId), ne(so.status, 'pending_payment'))).orderBy(desc(so.createdAt)).limit(8),
    getStoreRating(storeId),
  ]);
  return { kpi: k, products: prod, series, top, latest, rating };
}

export async function getStats(storeId: string, days: number) {
  const inPeriod = and(eq(so.storeId, storeId), since(days));
  const [series, [totals], [units], top, byCategory, byStatus] = await Promise.all([
    dailySales(storeId, days),
    db.select({
      revenue: num(sql`coalesce(sum(${so.total}) filter (where ${sold}), 0)`),
      net: num(sql`coalesce(sum(${so.sellerNet}) filter (where ${sold}), 0)`),
      orders: num(sql`count(*) filter (where ${sold})`),
    }).from(so).where(inPeriod),
    db.select({ units: num(sql`coalesce(sum(${orderItems.quantity}), 0)`) })
      .from(orderItems).innerJoin(so, eq(so.id, orderItems.sellerOrderId)).where(and(inPeriod, sold)),
    topProducts(storeId, days, 8),
    db.select({ label: categories.name, value: num(sql`sum(${orderItems.lineTotal})`) })
      .from(orderItems).innerJoin(so, eq(so.id, orderItems.sellerOrderId))
      .innerJoin(p, eq(p.id, orderItems.productId)).innerJoin(categories, eq(categories.id, p.categoryId))
      .where(and(inPeriod, sold)).groupBy(categories.name).orderBy(desc(sql`sum(${orderItems.lineTotal})`)).limit(8),
    db.select({ status: so.status, count: num(sql`count(*)`) }).from(so).where(inPeriod).groupBy(so.status),
  ]);
  return { series, ...totals, units: units.units, top, byCategory, byStatus };
}

// ---------- Productos ----------
export async function listProducts(storeId: string, f: { q?: string; status?: ProductStatus; page: number }) {
  const where = and(
    eq(p.storeId, storeId),
    f.status ? eq(p.status, f.status) : ne(p.status, 'archived'),
    f.q ? or(ilike(p.title, like(f.q)), ilike(p.sku, like(f.q))) : undefined,
  );
  const [items, [{ total }]] = await Promise.all([
    db.select({ id: p.id, title: p.title, slug: p.slug, status: p.status, price: p.price, salePrice: p.salePrice, salesCount: p.salesCount,
      updatedAt: p.updatedAt, isDemo: p.isDemo, stock: stockSum, image: firstImage, moderationNote: p.moderationNote })
      .from(p).where(where).orderBy(desc(p.updatedAt)).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: num(sql`count(*)`) }).from(p).where(where),
  ]);
  return { items, total };
}

export function getProductForStore(storeId: string, id: string) {
  return db.query.products.findFirst({
    where: and(eq(p.id, id), eq(p.storeId, storeId)),
    with: {
      images: { orderBy: [asc(productImages.position)] },
      variants: { orderBy: [asc(v.position)] },
      category: { with: { parent: true } },
    },
  });
}

// ---------- Pedidos ----------
export async function listOrders(storeId: string, f: { status?: SellerOrderStatus[]; page: number }) {
  const where = and(eq(so.storeId, storeId), f.status ? inArray(so.status, f.status) : ne(so.status, 'pending_payment'));
  const [items, [{ total }], counts] = await Promise.all([
    db.select(orderRow).from(so).innerJoin(orders, eq(orders.id, so.orderId)).where(where)
      .orderBy(desc(so.createdAt)).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: num(sql`count(*)`) }).from(so).where(where),
    db.select({ status: so.status, count: num(sql`count(*)`) }).from(so).where(eq(so.storeId, storeId)).groupBy(so.status),
  ]);
  return { items, total, counts: Object.fromEntries(counts.map((c) => [c.status, c.count])) as Partial<Record<SellerOrderStatus, number>> };
}

// ---------- Inventario ----------
export type StockFilter = 'bajo' | 'agotados' | undefined;
export async function listInventory(storeId: string, f: { filter: StockFilter; q?: string; page: number }) {
  const base = and(eq(p.storeId, storeId), ne(p.status, 'archived'), f.q ? or(ilike(p.title, like(f.q)), ilike(v.sku, like(f.q)), ilike(v.name, like(f.q))) : undefined);
  const where = and(base, f.filter === 'agotados' ? eq(v.stock, 0) : f.filter === 'bajo' ? sql`${v.stock} <= 5` : undefined);
  const [items, [{ total }], [counts]] = await Promise.all([
    db.select({ id: v.id, name: v.name, sku: v.sku, stock: v.stock, productId: p.id, title: p.title, status: p.status, image: firstImage })
      .from(v).innerJoin(p, eq(p.id, v.productId)).where(where)
      .orderBy(asc(v.stock), asc(p.title), asc(v.position)).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: num(sql`count(*)`) }).from(v).innerJoin(p, eq(p.id, v.productId)).where(where),
    db.select({ all: num(sql`count(*)`), low: num(sql`count(*) filter (where ${v.stock} <= 5)`), out: num(sql`count(*) filter (where ${v.stock} = 0)`) })
      .from(v).innerJoin(p, eq(p.id, v.productId)).where(and(eq(p.storeId, storeId), ne(p.status, 'archived'))),
  ]);
  return { items, total, counts };
}

// ---------- Reseñas ----------
export async function listStoreReviews(storeId: string, f: { rating?: number; unanswered?: boolean; page: number }) {
  const where = and(eq(reviews.storeId, storeId), f.rating ? eq(reviews.rating, f.rating) : undefined, f.unanswered ? isNull(reviewResponses.id) : undefined);
  const from = () => db.select({
    id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, verified: reviews.verified, status: reviews.status,
    createdAt: reviews.createdAt, buyerName: users.name, productId: p.id, productTitle: p.title,
    response: reviewResponses.body, respondedAt: reviewResponses.updatedAt,
  }).from(reviews).innerJoin(p, eq(p.id, reviews.productId)).innerJoin(users, eq(users.id, reviews.userId))
    .leftJoin(reviewResponses, eq(reviewResponses.reviewId, reviews.id));
  const [items, [{ total }], dist, [{ unanswered }]] = await Promise.all([
    from().where(where).orderBy(desc(reviews.createdAt)).limit(PAGE_SIZE).offset((f.page - 1) * PAGE_SIZE),
    db.select({ total: num(sql`count(*)`) }).from(reviews).leftJoin(reviewResponses, eq(reviewResponses.reviewId, reviews.id)).where(where),
    db.select({ rating: reviews.rating, count: num(sql`count(*)`) }).from(reviews)
      .where(and(eq(reviews.storeId, storeId), eq(reviews.status, 'published'))).groupBy(reviews.rating),
    db.select({ unanswered: num(sql`count(*)`) }).from(reviews).leftJoin(reviewResponses, eq(reviewResponses.reviewId, reviews.id))
      .where(and(eq(reviews.storeId, storeId), isNull(reviewResponses.id))),
  ]);
  return { items, total, unanswered, dist: [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: dist.find((d) => d.rating === r)?.count ?? 0 })) };
}

// ---------- Cupones, tienda y perfil ----------
export const listCoupons = (storeId: string) => db.select().from(coupons).where(eq(coupons.storeId, storeId)).orderBy(desc(coupons.createdAt));

export async function getStoreSettings(storeId: string, userId: string) {
  const [[store], [profile]] = await Promise.all([
    db.select().from(stores).where(eq(stores.id, storeId)),
    db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, userId)),
  ]);
  return { store, profile: profile ?? null };
}

/** Comisión global (fila con category_id NULL) y excepciones por categoría. */
export async function getCommissionInfo() {
  const rows = await db.select({ categoryId: platformCommissions.categoryId, rateBps: platformCommissions.rateBps, category: categories.name })
    .from(platformCommissions).leftJoin(categories, eq(categories.id, platformCommissions.categoryId)).orderBy(asc(categories.name));
  return { global: rows.find((r) => r.categoryId == null)?.rateBps ?? null, exceptions: rows.filter((r) => r.categoryId != null) };
}

export const bpsToPercent = (bps: number) => `${(bps / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} %`;

export async function getStoreRating(storeId: string) {
  const [r] = await db.select({ ratingAvg: stores.ratingAvg, ratingCount: stores.ratingCount }).from(stores).where(eq(stores.id, storeId));
  return r;
}
