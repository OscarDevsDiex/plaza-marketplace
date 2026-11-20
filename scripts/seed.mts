/**
 * DATOS DE DEMOSTRACIÓN — solo para desarrollo.
 * Todas las tiendas y productos quedan marcados con is_demo = true y la interfaz los etiqueta como "Demo".
 * Uso: npm run db:seed   (se niega a correr en producción)
 */
import { eq, sql } from 'drizzle-orm';
import { createDb } from '../src/lib/db/client';
import { runMigrations } from '../src/lib/db/migrate';
import * as schema from '../src/lib/db/schema';
import { hashPassword } from '../src/lib/crypto';
import { ensureBaseData } from '../src/lib/db/base-data';
import { commission, storeTotals } from '../src/lib/services/pricing';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('✗ El seed de demostración no se ejecuta en producción.');
  process.exit(1);
}

const db = createDb();
await runMigrations(db, { pglite: !process.env.DATABASE_URL });

const already = await db.select({ n: sql<number>`count(*)::int` }).from(schema.users);
if (already[0].n > 0 && !process.argv.includes('--reset')) {
  console.log('• La base ya tiene datos. Usa "npm run db:reset" para recrearla.');
  process.exit(0);
}

const img = (id: string, w = 1200) => `https://images.unsplash.com/photo-${id}?w=${w}&q=80&auto=format&fit=crop`;
const PASSWORD = 'Demo12345!';
const pw = await hashPassword(PASSWORD);

await db.transaction(async (tx) => {
  // ---------- Datos base (los mismos que en producción) + ajustes de demostración ----------
  await ensureBaseData(tx as unknown as typeof db);
  const roleId = Object.fromEntries((await tx.select().from(schema.roles)).map((r) => [r.key, r.id]));
  const cat: Record<string, number> = Object.fromEntries((await tx.select().from(schema.categories)).map((c) => [c.slug, c.id]));
  await tx.insert(schema.platformCommissions).values({ categoryId: cat.electronica, rateBps: 800 }).onConflictDoNothing();
  await tx.insert(schema.platformSettings).values({ key: 'supportEmail', value: 'soporte@plaza.dev' }).onConflictDoNothing();

  // ---------- Usuarios ----------
  const mkUser = async (name: string, email: string, keys: ('buyer' | 'seller' | 'admin')[]) => {
    const [u] = await tx.insert(schema.users).values({ name, email, passwordHash: pw, emailVerifiedAt: new Date() }).returning();
    await tx.insert(schema.userRoles).values(keys.map((k) => ({ userId: u.id, roleId: roleId[k] })));
    return u;
  };
  await mkUser('Administración Plaza', 'admin@plaza.dev', ['buyer', 'admin']);
  const buyers = [
    await mkUser('Lucía Hernández', 'lucia@demo.dev', ['buyer']),
    await mkUser('Diego Ramírez', 'diego@demo.dev', ['buyer']),
    await mkUser('Sofía Torres', 'sofia@demo.dev', ['buyer']),
  ];

  // ---------- Tiendas (demo) ----------
  const storeDefs = [
    { slug: 'sonido-norte', name: 'Sonido Norte', city: 'Monterrey', state: 'Nuevo León', desc: 'Audio y tecnología seleccionada. Garantía directa y envíos en 24 h.', banner: '1491553895911-0055eca6402d', owner: ['Mariana Garza', 'mariana@demo.dev'] },
    { slug: 'casa-alba', name: 'Casa Alba', city: 'Guadalajara', state: 'Jalisco', desc: 'Objetos para el hogar con diseño mexicano contemporáneo.', banner: '1555041469-a586c61ea9bc', owner: ['Andrés Ochoa', 'andres@demo.dev'] },
    { slug: 'paso-firme', name: 'Paso Firme', city: 'Ciudad de México', state: 'CDMX', desc: 'Calzado, ropa y accesorios para todos los días.', banner: '1441986300917-64674bd600d8', owner: ['Valeria Núñez', 'valeria@demo.dev'] },
    { slug: 'ritmo-activo', name: 'Ritmo Activo', city: 'Puebla', state: 'Puebla', desc: 'Equipo para entrenar en casa, correr y pedalear.', banner: '1517836357463-d25dfeac3438', owner: ['Rodrigo Silva', 'rodrigo@demo.dev'] },
  ];
  const storeMap: Record<string, typeof schema.stores.$inferSelect> = {};
  for (const s of storeDefs) {
    const owner = await mkUser(s.owner[0], s.owner[1], ['buyer', 'seller']);
    await tx.insert(schema.sellerProfiles).values({ userId: owner.id, legalName: s.owner[0], phone: '5512345678', acceptedTermsAt: new Date() });
    const [st] = await tx.insert(schema.stores).values({
      ownerId: owner.id, slug: s.slug, name: s.name, description: s.desc, city: s.city, state: s.state, bannerUrl: img(s.banner, 1600),
      shippingFlat: 9900, freeShippingOver: 79900, isDemo: true,
    }).returning();
    storeMap[s.slug] = st;
  }

  // ---------- Productos (demo) ----------
  type P = [store: string, cat: string, title: string, brand: string, price: number, sale: number | null, images: string[], variants: [string, number][], desc: string, condition?: 'new' | 'used' | 'refurbished'];
  const P: P[] = [
    ['sonido-norte', 'audio', 'Audífonos inalámbricos con cancelación de ruido', 'Aurel', 249900, 199900, ['1505740420928-5e560c06d30e', '1546435770-a3e426bf472b'], [['Negro', 14], ['Blanco', 6]], 'Cancelación activa de ruido, 30 horas de batería y carga rápida USB-C. Plegables, con estuche rígido.'],
    ['sonido-norte', 'audio', 'Audífonos in-ear deportivos', 'Aurel', 89900, null, ['1606220588913-b3aacb4d2f46'], [['Único', 25]], 'Resistentes al sudor (IPX5), ajuste seguro y estuche de carga con 24 horas adicionales.'],
    ['sonido-norte', 'audio', 'Bocina Bluetooth portátil', 'Tonal', 129900, 109900, ['1608043152269-423dbba4e7e1'], [['Único', 18]], 'Sonido 360°, resistente al agua y 12 horas de reproducción.'],
    ['sonido-norte', 'celulares', 'Smartphone 128 GB (reacondicionado)', 'Nova', 559900, 499900, ['1511707171634-5f897ff02aa9'], [['128 GB', 5]], 'Equipo reacondicionado y probado, batería al 90 % o más, con 6 meses de garantía.', 'refurbished'],
    ['sonido-norte', 'computacion', 'Laptop ultraligera 14"', 'Vértice', 1599900, null, ['1496181133206-80ce9b88a853', '1517336714731-489689fd1ca8'], [['16 GB / 512 GB', 4], ['8 GB / 256 GB', 7]], 'Pantalla 14" Full HD, 1.2 kg y hasta 12 horas de batería.'],
    ['sonido-norte', 'computacion', 'Teclado mecánico compacto', 'Vértice', 149900, null, ['1587829741301-dc798b83add3'], [['Switch rojo', 9], ['Switch azul', 0]], 'Formato 75 %, retroiluminación y conexión por cable o Bluetooth.'],
    ['sonido-norte', 'computacion', 'Mouse inalámbrico ergonómico', 'Vértice', 59900, 49900, ['1527864550417-7fd91fc51a46'], [['Único', 30]], 'Diseño ergonómico, sensor preciso y batería de larga duración.'],
    ['sonido-norte', 'accesorios', 'Cámara instantánea', 'Lumo', 189900, null, ['1526170375885-4d8ecf77b99f'], [['Único', 3]], 'Imprime tus fotos al momento. Flash automático y modo selfie.'],
    ['casa-alba', 'decoracion', 'Planta suculenta en maceta de cerámica', 'Alba', 34900, null, ['1485955900006-10f4d324d411'], [['Chica', 20], ['Mediana', 12]], 'Suculenta de fácil cuidado en maceta hecha a mano.'],
    ['casa-alba', 'cocina', 'Taza de cerámica artesanal', 'Alba', 24900, 19900, ['1514228742587-6b1558fcca3d'], [['Arena', 30], ['Grafito', 22]], 'Cerámica de alta temperatura, apta para microondas y lavavajillas. 350 ml.'],
    ['casa-alba', 'decoracion', 'Lámpara de mesa minimalista', 'Alba', 129900, null, ['1507473885765-e6ed057f782c'], [['Único', 8]], 'Base de madera de encino y pantalla de lino. Foco incluido.'],
    ['casa-alba', 'muebles', 'Sofá de tres plazas', 'Alba', 1499900, 1299900, ['1555041469-a586c61ea9bc'], [['Gris', 2], ['Arena', 1]], 'Estructura de madera sólida y tela resistente a manchas. Entrega en 10 días hábiles.'],
    ['casa-alba', 'cocina', 'Set de utensilios de cocina', 'Alba', 79900, null, ['1556909114-f6e7ad7d3136'], [['Único', 15]], 'Seis piezas de silicón grado alimenticio con mango de madera.'],
    ['paso-firme', 'calzado', 'Tenis para correr', 'Zancada', 189900, 159900, ['1542291026-7eec264c27ff'], [['25', 4], ['26', 6], ['27', 6], ['28', 3], ['29', 0]], 'Ligeros y transpirables, con suela amortiguada. Tallas en centímetros (MX).'],
    ['paso-firme', 'calzado', 'Tenis urbanos clásicos', 'Zancada', 149900, null, ['1549298916-b41d501d3772'], [['25', 5], ['26', 8], ['27', 7], ['28', 4]], 'Piel sintética de fácil limpieza y plantilla acolchada.'],
    ['paso-firme', 'ropa', 'Playera básica de algodón', 'Hilo', 29900, null, ['1521572163474-6864f9cf17ab'], [['CH', 20], ['M', 25], ['G', 18], ['EG', 10]], '100 % algodón peinado, corte regular.'],
    ['paso-firme', 'ropa', 'Chamarra de piel', 'Hilo', 349900, 299900, ['1551028719-00167b16eac5'], [['M', 3], ['G', 2]], 'Piel genuina, forro interior y cierres metálicos.'],
    ['paso-firme', 'accesorios', 'Mochila urbana impermeable', 'Ruta', 109900, 89900, ['1553062407-98eeb64c6a62'], [['Azul marino', 8], ['Negro', 10]], 'Compartimento acolchado para laptop de 15" y tela repelente al agua.'],
    ['paso-firme', 'accesorios', 'Lentes de sol polarizados', 'Ruta', 79900, null, ['1572635196237-14b3f281503f'], [['Único', 15]], 'Protección UV400 y micas polarizadas. Incluyen funda.'],
    ['paso-firme', 'accesorios', 'Reloj clásico de acero', 'Hora', 249900, null, ['1523275335684-37898b6baf30'], [['Plata', 6], ['Negro', 4]], 'Caja de acero inoxidable, resistente al agua y correa intercambiable.'],
    ['paso-firme', 'accesorios', 'Bolsa de mano de piel', 'Ruta', 189900, null, ['1584917865442-de89df76afd3'], [['Camel', 4], ['Negro', 5]], 'Piel genuina con correa ajustable.', 'new'],
    ['ritmo-activo', 'fitness', 'Mancuernas ajustables 2 × 10 kg', 'Fuerza', 219900, 189900, ['1599058917212-d750089bc07e'], [['Único', 7]], 'Ajuste rápido de peso de 2 a 10 kg por mancuerna.'],
    ['ritmo-activo', 'fitness', 'Tapete de yoga antiderrapante', 'Fuerza', 49900, null, ['1571019613454-1cb2f99b2d8b'], [['Morado', 15], ['Negro', 20]], '6 mm de grosor, material TPE libre de olores.'],
    ['ritmo-activo', 'ciclismo', 'Bicicleta urbana rodada 28', 'Pedal', 699900, null, ['1485965120184-e220f721d03e'], [['Talla M', 3], ['Talla G', 2]], 'Cuadro de aluminio, 7 velocidades y frenos de disco.'],
    ['ritmo-activo', 'ciclismo', 'Bicicleta de montaña usada', 'Pedal', 459900, null, ['1485965120184-e220f721d03e'], [['Talla M', 1]], 'Usada en buen estado, servicio completo recién hecho.', 'used'],
    ['casa-alba', 'fragancias', 'Perfume floral 100 ml', 'Esencia', 119900, null, ['1541643600914-78b084683601'], [['100 ml', 9]], 'Fragancia floral con notas de vainilla. Larga duración.'],
    ['casa-alba', 'cuidado-personal', 'Kit de cuidado facial', 'Esencia', 89900, 74900, ['1556228578-8c89e6adf883'], [['Único', 12]], 'Limpiador, sérum y crema hidratante para todo tipo de piel.'],
    ['casa-alba', 'cuidado-personal', 'Set de maquillaje esencial', 'Esencia', 64900, null, ['1571781926291-c477ebfd024b'], [['Único', 0]], 'Base, rubor y máscara en tonos naturales.'],
    ['paso-firme', 'novela', 'Novela: El jardín de los días', 'Editorial Faro', 34900, null, ['1544947950-fa07a98d237f'], [['Pasta blanda', 20]], 'Una historia sobre memoria y familia. 320 páginas.'],
  ];
  const created: { id: string; storeId: string; categoryId: number; variants: { id: string; name: string; price: number }[]; title: string; image: string; price: number }[] = [];
  for (const [i, [st, c, title, brand, price, sale, images, variants, desc, condition]] of P.entries()) {
    const store = storeMap[st];
    const slug = `${title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${(i + 101).toString(36)}`;
    const publishedAt = new Date(Date.now() - (P.length - i) * 86400_000 * 2);
    const [prod] = await tx.insert(schema.products).values({
      storeId: store.id, categoryId: cat[c], slug, title, brand, price, salePrice: sale, description: desc, condition: condition ?? 'new',
      status: 'active', publishedAt, isDemo: true, sku: `DEMO-${i + 1}`, weightGrams: 800, shippingInfo: 'Se envía en 1 a 2 días hábiles.',
    }).returning();
    await tx.insert(schema.productImages).values(images.map((im, k) => ({ productId: prod.id, url: img(im), thumbUrl: img(im, 480), position: k, alt: title })));
    const vs = await tx.insert(schema.productVariants).values(variants.map(([name, stock], k) => ({ productId: prod.id, name, stock, position: k }))).returning();
    for (const vr of vs) await tx.insert(schema.inventoryMovements).values({ variantId: vr.id, delta: vr.stock, reason: 'initial' });
    created.push({ id: prod.id, storeId: store.id, categoryId: cat[c], variants: vs.map((x) => ({ id: x.id, name: x.name, price: sale ?? price })), title, image: img(images[0], 480), price: sale ?? price });
  }

  await tx.insert(schema.coupons).values([
    { storeId: storeMap['sonido-norte'].id, code: 'BIENVENIDA10', type: 'percent', value: 10 },
    { storeId: storeMap['casa-alba'].id, code: 'CASA100', type: 'fixed', value: 10000, minSubtotal: 50000 },
  ]);

  // ---------- Historial de pedidos entregados con reseñas verificadas (demo) ----------
  const comments = [
    [5, 'Excelente', 'Llegó antes de lo esperado y la calidad es muy buena. Totalmente recomendado.'],
    [4, 'Muy bien', 'Cumple con lo que promete. El empaque podría mejorar, pero el producto está perfecto.'],
    [5, 'Me encantó', 'Superó mis expectativas, la tienda respondió todas mis dudas rápidamente.'],
    [3, 'Correcto', 'Está bien por el precio, aunque tardó un poco en llegar.'],
    [5, 'Volvería a comprar', 'Producto idéntico a las fotos y muy bien empacado.'],
  ] as const;
  let k = 0;
  for (const prod of created.slice(0, 18)) {
    const reviewers = buyers.slice(0, 1 + (k % 3));
    for (const buyer of reviewers) {
      const variant = prod.variants[0];
      const lines = [{ variantId: variant.id, unitPrice: variant.price, quantity: 1, categoryId: prod.categoryId }];
      const t = storeTotals(lines, { shippingFlat: 9900, freeShippingOver: 79900 });
      const fee = commission(lines, 0, (cid) => (cid === cat.electronica || [cat.audio, cat.celulares, cat.computacion].includes(cid) ? 800 : 1000));
      const createdAt = new Date(Date.now() - (30 - (k % 25)) * 86400_000);
      const address = { recipientName: buyer.name, phone: '5598765432', street: 'Av. Insurgentes Sur', extNumber: '1000', neighborhood: 'Del Valle', city: 'Ciudad de México', state: 'CDMX', postalCode: '03100', country: 'MX' };
      const [o] = await tx.insert(schema.orders).values({
        buyerId: buyer.id, buyerName: buyer.name, buyerEmail: buyer.email, status: 'completed', subtotal: t.subtotal, shippingTotal: t.shipping, total: t.total,
        shippingAddress: address, paidAt: createdAt, createdAt,
      }).returning();
      const [so] = await tx.insert(schema.sellerOrders).values({
        orderId: o.id, storeId: prod.storeId, status: 'delivered', subtotal: t.subtotal, shipping: t.shipping, total: t.total,
        commissionRateBps: fee.rateBps, commissionAmount: fee.amount, sellerNet: t.total - fee.amount, payoutStatus: 'eligible', createdAt,
      }).returning();
      const [oi] = await tx.insert(schema.orderItems).values({
        sellerOrderId: so.id, productId: prod.id, variantId: variant.id, title: prod.title, variantName: variant.name, imageUrl: prod.image,
        unitPrice: variant.price, quantity: 1, lineTotal: variant.price,
      }).returning();
      const [pay] = await tx.insert(schema.payments).values({ orderId: o.id, provider: 'sandbox', providerPaymentId: `sbx_seed_${o.id}`, status: 'approved', amount: t.total, createdAt }).returning();
      await tx.insert(schema.paymentTransactions).values({ paymentId: pay.id, provider: 'sandbox', type: 'webhook', providerEventId: `seed_${o.id}`, status: 'approved', amount: t.total, data: { seed: true } });
      const [sh] = await tx.insert(schema.shipments).values({ sellerOrderId: so.id, carrier: 'Estafeta', trackingNumber: `DEMO${100000 + k}`, status: 'delivered', shippedAt: createdAt, deliveredAt: createdAt }).returning();
      await tx.insert(schema.shipmentEvents).values([
        { shipmentId: sh.id, status: 'in_transit', description: 'Enviado con Estafeta', occurredAt: createdAt },
        { shipmentId: sh.id, status: 'delivered', description: 'Entregado', occurredAt: createdAt },
      ]);
      const [rating, title, body] = comments[k % comments.length];
      const [rv] = await tx.insert(schema.reviews).values({
        productId: prod.id, storeId: prod.storeId, userId: buyer.id, orderItemId: oi.id, rating, title, body, verified: true, createdAt, helpfulCount: k % 4,
      }).returning();
      if (k % 4 === 0) {
        const ownerId = (await tx.select({ o: schema.stores.ownerId }).from(schema.stores).where(eq(schema.stores.id, prod.storeId)))[0].o;
        await tx.insert(schema.reviewResponses).values({ reviewId: rv.id, storeId: prod.storeId, authorId: ownerId, body: '¡Gracias por tu compra y por tomarte el tiempo de escribir! Nos alegra que te haya gustado.', createdAt: new Date(createdAt.getTime() + 5 * 3600_000) });
      }
      await tx.update(schema.products).set({ salesCount: sql`${schema.products.salesCount} + 1` }).where(eq(schema.products.id, prod.id));
      await tx.update(schema.stores).set({ salesCount: sql`${schema.stores.salesCount} + 1` }).where(eq(schema.stores.id, prod.storeId));
      k++;
    }
  }
  // Promedios desde la fuente
  await tx.execute(sql`update products p set rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews r where r.product_id = p.id and r.status = 'published'), 0),
    rating_count = (select count(*) from reviews r where r.product_id = p.id and r.status = 'published')`);
  await tx.execute(sql`update stores s set rating_avg = coalesce((select round(avg(rating)::numeric, 2) from reviews r where r.store_id = s.id and r.status = 'published'), 0),
    rating_count = (select count(*) from reviews r where r.store_id = s.id and r.status = 'published')`);
});

console.log(`✓ Datos de demostración creados.
  Contraseña de todas las cuentas demo: ${PASSWORD}
  Administrador:  admin@plaza.dev
  Vendedores:     mariana@demo.dev · andres@demo.dev · valeria@demo.dev · rodrigo@demo.dev
  Compradores:    lucia@demo.dev · diego@demo.dev · sofia@demo.dev`);
process.exit(0);
