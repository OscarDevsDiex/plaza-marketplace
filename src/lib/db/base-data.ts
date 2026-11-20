/**
 * Datos base que toda instalación necesita (también producción): roles, categorías, comisión global y ajustes.
 * Es idempotente: se puede ejecutar en cada despliegue sin duplicar nada.
 */
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { DB } from './client';
import * as s from './schema';

export const CATEGORY_TREE: [slug: string, name: string, icon: string, children: [string, string][]][] = [
  ['electronica', 'Electrónica', 'cpu', [['audio', 'Audio'], ['celulares', 'Celulares'], ['computacion', 'Computación']]],
  ['moda', 'Moda', 'shirt', [['ropa', 'Ropa'], ['calzado', 'Calzado'], ['accesorios', 'Accesorios']]],
  ['hogar', 'Hogar', 'sofa', [['cocina', 'Cocina'], ['decoracion', 'Decoración'], ['muebles', 'Muebles']]],
  ['deportes', 'Deportes', 'dumbbell', [['fitness', 'Fitness'], ['ciclismo', 'Ciclismo']]],
  ['belleza', 'Belleza', 'sparkles', [['cuidado-personal', 'Cuidado personal'], ['fragancias', 'Fragancias']]],
  ['libros', 'Libros', 'book-open', [['novela', 'Novela'], ['no-ficcion', 'No ficción']]],
];

export async function ensureBaseData(db: DB, opts: { adminEmail?: string } = {}) {
  await db.insert(s.roles).values([
    { key: 'buyer', name: 'Comprador' }, { key: 'seller', name: 'Vendedor' }, { key: 'admin', name: 'Administrador' },
  ]).onConflictDoNothing();

  // Las categorías solo se crean en una base vacía: después las administra el panel de administración.
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(s.categories);
  if (n === 0) {
    for (const [i, [slug, name, icon, kids]] of CATEGORY_TREE.entries()) {
      const [c] = await db.insert(s.categories).values({ slug, name, icon, position: i }).returning();
      for (const [j, [kslug, kname]] of kids.entries()) await db.insert(s.categories).values({ slug: kslug, name: kname, parentId: c.id, position: j });
    }
  }

  const global = await db.select({ id: s.platformCommissions.id }).from(s.platformCommissions).where(isNull(s.platformCommissions.categoryId));
  if (!global.length) await db.insert(s.platformCommissions).values({ rateBps: 1000 });
  await db.insert(s.platformSettings).values({ key: 'requireProductApproval', value: false }).onConflictDoNothing();

  // ADMIN_EMAIL: la cuenta con ese correo recibe el rol de administrador (si ya existe; si no, al registrarse).
  if (opts.adminEmail) {
    const [u] = await db.select({ id: s.users.id }).from(s.users).where(sql`lower(${s.users.email}) = ${opts.adminEmail.trim().toLowerCase()}`);
    const [admin] = await db.select({ id: s.roles.id }).from(s.roles).where(eq(s.roles.key, 'admin'));
    if (u) {
      const has = await db.select().from(s.userRoles).where(and(eq(s.userRoles.userId, u.id), eq(s.userRoles.roleId, admin.id)));
      if (!has.length) await db.insert(s.userRoles).values({ userId: u.id, roleId: admin.id });
    }
  }
}
