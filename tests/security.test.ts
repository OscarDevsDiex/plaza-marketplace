import { beforeAll, describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { hashPassword, verifyPassword, sha256 } from '../src/lib/crypto';
import { createDb, type DB } from '../src/lib/db/client';
import { runMigrations } from '../src/lib/db/migrate';
import * as s from '../src/lib/db/schema';

describe('contraseñas', () => {
  it('scrypt con sal: hashes distintos, verificación correcta', async () => {
    const a = await hashPassword('Secreta12345');
    const b = await hashPassword('Secreta12345');
    expect(a).not.toBe(b);
    expect(a.startsWith('scrypt$32768$8$3$')).toBe(true);
    expect(await verifyPassword('Secreta12345', a)).toBe(true);
    expect(await verifyPassword('secreta12345', a)).toBe(false);
    expect(await verifyPassword('x', 'formato-invalido')).toBe(false);
  });
  it('los tokens se guardan como hash', () => {
    expect(sha256('abc')).toHaveLength(64);
  });
});

/** Las reglas críticas también viven en la base de datos: aunque haya un error en el código, los datos no se corrompen. */
describe('restricciones de la base de datos', () => {
  let db: DB;
  let ids: { user: string; store: string; product: string; variant: string; item: string };

  beforeAll(async () => {
    db = createDb({ dataDir: 'memory://' });
    await runMigrations(db, { pglite: true });
    const [u] = await db.insert(s.users).values({ email: 'a@a.mx', name: 'A', passwordHash: 'x' }).returning();
    const [st] = await db.insert(s.stores).values({ ownerId: u.id, slug: 't', name: 'T' }).returning();
    const [c] = await db.insert(s.categories).values({ slug: 'c', name: 'C' }).returning();
    const [p] = await db.insert(s.products).values({ storeId: st.id, categoryId: c.id, slug: 'p', title: 'Audífonos inalámbricos', price: 1000, status: 'active' }).returning();
    const [v] = await db.insert(s.productVariants).values({ productId: p.id, name: 'Único', stock: 2 }).returning();
    const [o] = await db.insert(s.orders).values({ buyerId: u.id, subtotal: 1000, total: 1000, buyerName: 'A', buyerEmail: 'a@a.mx', shippingAddress: { recipientName: 'A', phone: '1', street: 's', extNumber: '1', neighborhood: 'n', city: 'c', state: 's', postalCode: '01000', country: 'MX' } }).returning();
    const [so] = await db.insert(s.sellerOrders).values({ orderId: o.id, storeId: st.id, subtotal: 1000, total: 1000, commissionRateBps: 1000, commissionAmount: 100, sellerNet: 900 }).returning();
    const [it] = await db.insert(s.orderItems).values({ sellerOrderId: so.id, productId: p.id, variantId: v.id, title: 'x', variantName: 'Único', unitPrice: 1000, quantity: 1, lineTotal: 1000 }).returning();
    ids = { user: u.id, store: st.id, product: p.id, variant: v.id, item: it.id };
  });

  it('las existencias nunca quedan negativas', async () => {
    await expect(db.update(s.productVariants).set({ stock: -1 }).where(sql`id = ${ids.variant}`)).rejects.toThrow();
  });
  it('el correo es único sin importar mayúsculas', async () => {
    await expect(db.insert(s.users).values({ email: 'A@A.MX', name: 'B', passwordHash: 'x' })).rejects.toThrow();
  });
  it('el precio de oferta debe ser menor al precio', async () => {
    await expect(db.update(s.products).set({ salePrice: 2000 }).where(sql`id = ${ids.product}`)).rejects.toThrow();
  });
  it('una sola reseña por persona y producto, con calificación 1-5', async () => {
    const base = { productId: ids.product, storeId: ids.store, userId: ids.user, orderItemId: ids.item, body: 'Muy buen producto' };
    await expect(db.insert(s.reviews).values({ ...base, rating: 6 })).rejects.toThrow();
    await db.insert(s.reviews).values({ ...base, rating: 5 });
    await expect(db.insert(s.reviews).values({ ...base, rating: 4 })).rejects.toThrow();
  });
  it('búsqueda en español sin acentos', async () => {
    const rows = await db.execute(sql`select id from products where search_vector @@ websearch_to_tsquery('spanish', immutable_unaccent('audifonos inalambricos'))`);
    expect((Array.isArray(rows) ? rows : (rows as { rows: unknown[] }).rows).length).toBe(1);
  });
});
