import 'server-only';
import { sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { rowsOf } from '@/lib/db/client';
import { clientIp } from '@/lib/auth/session';

/**
 * Límite de intentos guardado en la base de datos (funciona aunque haya varias instancias del servidor).
 * Devuelve true si la acción está permitida.
 */
export async function rateLimit(bucket: string, limit: number, windowSeconds: number, id?: string) {
  const key = `${bucket}:${id ?? (await clientIp())}`;
  const result = await db.execute(sql`
    INSERT INTO rate_limits (key, count, reset_at) VALUES (${key}, 1, now() + make_interval(secs => ${windowSeconds}))
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN rate_limits.reset_at < now() THEN 1 ELSE rate_limits.count + 1 END,
      reset_at = CASE WHEN rate_limits.reset_at < now() THEN excluded.reset_at ELSE rate_limits.reset_at END
    RETURNING count`);
  return Number(rowsOf<{ count: number }>(result)[0]?.count) <= limit;
}

/** Registro de auditoría para acciones sensibles (admin, cambios de estado, dinero). Nunca guarda contraseñas ni tokens. */
export async function audit(actorId: string | null, action: string, entityType: string, entityId?: string | null, metadata?: Record<string, unknown>) {
  try {
    await db.insert(schema.auditLogs).values({ actorId, action, entityType, entityId: entityId ?? null, metadata: metadata ?? null, ip: await clientIp().catch(() => null) });
  } catch (e) {
    console.error('audit log failed', e); // la auditoría nunca debe tumbar la operación principal
  }
}
