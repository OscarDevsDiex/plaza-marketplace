import path from 'node:path';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { migrate as migratePostgres } from 'drizzle-orm/postgres-js/migrator';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import type { DB } from './client';

/** Aplica las migraciones pendientes de /drizzle (cada una una sola vez, registradas en drizzle.__drizzle_migrations). */
export async function runMigrations(db: DB, opts: { pglite: boolean }) {
  const migrationsFolder = path.resolve(process.cwd(), 'drizzle');
  if (opts.pglite) await migratePglite(db as unknown as PgliteDatabase<Record<string, never>>, { migrationsFolder });
  else await migratePostgres(db, { migrationsFolder });
}
