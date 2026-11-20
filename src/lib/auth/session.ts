import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { and, eq, gt, sql } from 'drizzle-orm';
import { db, schema, requestData } from '@/lib/db';
import { randomToken, sha256 } from '@/lib/crypto';
import { IS_PROD } from '@/lib/config';

const { sessions, users, userRoles, roles, stores } = schema;

// __Host- obliga a Secure + Path=/ y sin Domain: la cookie no se puede plantar desde subdominios.
export const SESSION_COOKIE = IS_PROD ? '__Host-plaza_session' : 'plaza_session';
const SESSION_DAYS = 30;

export type Role = 'buyer' | 'seller' | 'admin';
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  roles: Role[];
  store: { id: string; slug: string; name: string; status: 'active' | 'suspended' } | null;
};

export async function clientIp() {
  const h = await headers();
  return h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local';
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db.insert(sessions).values({
    id: sha256(token), userId, expiresAt, ip: await clientIp(), userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: IS_PROD, sameSite: 'lax', path: '/', expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, sha256(token)));
  jar.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Usuario de la petición actual (o null). Memorizado por petición con React.cache. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  await requestData(); // lo que se lea después (pedidos, paneles) siempre es dato fresco de la petición
  if (!token || token.length > 100) return null;
  const [row] = await db
    .select({ id: users.id, name: users.name, email: users.email, verified: users.emailVerifiedAt, status: users.status })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, sha256(token)), gt(sessions.expiresAt, sql`now()`)))
    .limit(1);
  if (!row || row.status !== 'active') return null;
  const [roleRows, [store]] = await Promise.all([
    db.select({ key: roles.key }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, row.id)),
    db.select({ id: stores.id, slug: stores.slug, name: stores.name, status: stores.status }).from(stores).where(eq(stores.ownerId, row.id)).limit(1),
  ]);
  return { id: row.id, name: row.name, email: row.email, emailVerified: !!row.verified, roles: roleRows.map((r) => r.key), store: store ?? null };
});
