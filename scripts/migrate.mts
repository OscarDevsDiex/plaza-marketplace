import { createDb } from '../src/lib/db/client';
import { runMigrations } from '../src/lib/db/migrate';

const db = createDb();
await runMigrations(db, { pglite: !process.env.DATABASE_URL });
console.log('✓ Migraciones aplicadas');
process.exit(0);
