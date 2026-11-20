/** Borra la base local (PGlite) y la vuelve a crear con datos de demostración. Nunca toca una base remota. */
import { rmSync } from 'node:fs';
import { execSync } from 'node:child_process';

if (process.env.DATABASE_URL) {
  console.error('✗ db:reset solo funciona con la base local de desarrollo (sin DATABASE_URL).');
  process.exit(1);
}
rmSync(process.env.PGLITE_DIR ?? '.data/pglite', { recursive: true, force: true });
execSync('npx tsx scripts/seed.mts', { stdio: 'inherit' });
