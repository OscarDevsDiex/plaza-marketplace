import 'server-only';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

const { orders, sellerOrders, orderItems, stores, shipments, shipmentEvents, payments, reviews, favorites, storeFollowers } = schema;

/** Pedidos del comprador (solo los suyos), con sus sub-pedidos y artículos. */
export async function listBuyerOrders(userId: string, limit = 50) {
  const os = await db.select().from(orders).where(eq(orders.buyerId, userId)).orderBy(desc(orders.createdAt)).limit(limit);
  if (!os.length) return [];
  const sos = await db.select({ so: sellerOrders, storeName: stores.name }).from(sellerOrders).innerJoin(stores, eq(stores.id, sellerOrders.storeId))
    .where(inArray(sellerOrders.orderId, os.map((o) => o.id)));
  const items = await db.select().from(orderItems).where(inArray(orderItems.sellerOrderId, sos.map((s) => s.so.id)));
  return os.map((o) => ({
    ...o,
    sellerOrders: sos.filter((s) => s.so.orderId === o.id).map((s) => ({ ...s.so, storeName: s.storeName, items: items.filter((i) => i.sellerOrderId === s.so.id) })),
  }));
}

export async function getBuyerOrder(userId: string, orderId: string) {
  if (!/^[0-9a-f-]{36}$/.test(orderId)) return null;
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.buyerId, userId)));
  if (!o) return null;
  const sos = await db.select({ so: sellerOrders, store: { name: stores.name, slug: stores.slug } }).from(sellerOrders)
    .innerJoin(stores, eq(stores.id, sellerOrders.storeId)).where(eq(sellerOrders.orderId, o.id));
  const soIds = sos.map((s) => s.so.id);
  const [items, ships, pays, revs] = await Promise.all([
    db.select().from(orderItems).where(inArray(orderItems.sellerOrderId, soIds)),
    db.select().from(shipments).where(inArray(shipments.sellerOrderId, soIds)),
    db.select().from(payments).where(eq(payments.orderId, o.id)).orderBy(desc(payments.createdAt)),
    db.select({ orderItemId: reviews.orderItemId, rating: reviews.rating }).from(reviews).where(eq(reviews.userId, userId)),
  ]);
  const events = ships.length ? await db.select().from(shipmentEvents).where(inArray(shipmentEvents.shipmentId, ships.map((s) => s.id))).orderBy(shipmentEvents.occurredAt) : [];
  // Productos ya reseñados (una reseña por producto, aunque se haya comprado varias veces)
  const reviewedProducts = new Set((await db.select({ productId: reviews.productId }).from(reviews).where(eq(reviews.userId, userId))).map((r) => r.productId));
  return {
    ...o,
    payment: pays[0] ?? null,
    sellerOrders: sos.map((s) => {
      const ship = ships.find((x) => x.sellerOrderId === s.so.id) ?? null;
      return {
        ...s.so, store: s.store,
        items: items.filter((i) => i.sellerOrderId === s.so.id).map((i) => ({ ...i, reviewed: revs.some((r) => r.orderItemId === i.id) || (!!i.productId && reviewedProducts.has(i.productId)) })),
        shipment: ship ? { ...ship, events: events.filter((e) => e.shipmentId === ship.id) } : null,
      };
    }),
  };
}

export async function favoriteProductIds(userId: string) {
  return (await db.select({ id: favorites.productId }).from(favorites).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt))).map((r) => r.id);
}

export async function followedStores(userId: string) {
  return db.select({ id: stores.id, slug: stores.slug, name: stores.name, logoUrl: stores.logoUrl, city: stores.city, ratingAvg: stores.ratingAvg, ratingCount: stores.ratingCount, status: stores.status })
    .from(storeFollowers).innerJoin(stores, eq(stores.id, storeFollowers.storeId)).where(eq(storeFollowers.userId, userId)).orderBy(desc(storeFollowers.createdAt));
}

/** Artículo comprado elegible para reseña, verificando que pertenece a la persona. */
export async function reviewTarget(userId: string, orderItemId: string) {
  if (!/^[0-9a-f-]{36}$/.test(orderItemId)) return null;
  const [row] = await db.select({ item: orderItems, status: sellerOrders.status, buyerId: orders.buyerId, slug: schema.products.slug })
    .from(orderItems).innerJoin(sellerOrders, eq(sellerOrders.id, orderItems.sellerOrderId)).innerJoin(orders, eq(orders.id, sellerOrders.orderId))
    .leftJoin(schema.products, eq(schema.products.id, orderItems.productId))
    .where(eq(orderItems.id, orderItemId));
  if (!row || row.buyerId !== userId) return null;
  const already = row.item.productId ? (await db.select({ id: reviews.id }).from(reviews).where(and(eq(reviews.userId, userId), eq(reviews.productId, row.item.productId)))).length > 0 : false;
  return { ...row, already };
}
