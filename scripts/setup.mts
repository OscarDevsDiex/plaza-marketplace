/**
 * Prepara la base de datos en cada despliegue: aplica migraciones y crea los datos base (sin datos de demostración).
 * En Vercel se ejecuta automáticamente antes de compilar (script "vercel-build").
 */
import { createDb } from '../src/lib/db/client';
import { runMigrations } from '../src/lib/db/migrate';
import { ensureBaseData } from '../src/lib/db/base-data';

// Migraciones por la conexión directa si existe (Neon la expone como DATABASE_URL_UNPOOLED).
const db = createDb({ url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL });
await runMigrations(db, { pglite: !process.env.DATABASE_URL });
await ensureBaseData(db, { adminEmail: process.env.ADMIN_EMAIL });
console.log('✓ Base de datos lista (migraciones y datos base)');
process.exit(0);
