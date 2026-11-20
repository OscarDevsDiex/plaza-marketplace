import { AppError } from '@/lib/errors';
import 'server-only';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { dummyHash, hashPassword, randomToken, sha256, verifyPassword } from '@/lib/crypto';
import { emailLayout, sendEmail } from '@/lib/email';
import { APP_NAME } from '@/lib/config';
import { audit } from '@/lib/security';
import { createSession, destroyAllSessions } from '@/lib/auth/session';
import { mergeGuestCart } from './cart';

const { users, roles, userRoles, authTokens } = schema;
export class AuthFlowError extends AppError {}

import { PASSWORD_RULES } from './auth-rules';
export function passwordProblem(pw: string) {
  if (pw.length < 10 || pw.length > 200) return PASSWORD_RULES;
  if (!/[a-zA-Z]/.test(pw) || !/\d/.test(pw)) return PASSWORD_RULES;
  return null;
}
const normEmail = (e: string) => e.trim().toLowerCase();

async function issueToken(userId: string, type: 'verify_email' | 'reset_password', ttlMinutes: number) {
  const token = randomToken(32);
  // Invalida tokens anteriores del mismo tipo: solo el último enlace funciona.
  await db.update(authTokens).set({ usedAt: new Date() }).where(and(eq(authTokens.userId, userId), eq(authTokens.type, type), isNull(authTokens.usedAt)));
  await db.insert(authTokens).values({ userId, type, tokenHash: sha256(token), expiresAt: new Date(Date.now() + ttlMinutes * 60_000) });
  return token;
}

/** Consume un token de un solo uso. Devuelve el userId o null si es inválido/expiró/ya se usó. */
async function consumeToken(token: string, type: 'verify_email' | 'reset_password') {
  if (!token || token.length > 100) return null;
  const [row] = await db.update(authTokens).set({ usedAt: new Date() })
    .where(and(eq(authTokens.tokenHash, sha256(token)), eq(authTokens.type, type), isNull(authTokens.usedAt), gt(authTokens.expiresAt, sql`now()`)))
    .returning({ userId: authTokens.userId });
  return row?.userId ?? null;
}

export async function sendVerificationEmail(userId: string, email: string) {
  const token = await issueToken(userId, 'verify_email', 60 * 24);
  await sendEmail(email, `Confirma tu correo en ${APP_NAME}`, emailLayout({
    title: 'Confirma tu correo', intro: 'Confirma tu dirección para proteger tu cuenta y recibir avisos de tus pedidos. El enlace vence en 24 horas.',
    cta: { label: 'Confirmar correo', href: `/verificar/${token}` },
  }));
}

export async function register(input: { name: string; email: string; password: string }) {
  const name = input.name.trim().slice(0, 80), email = normEmail(input.email);
  if (name.length < 2) throw new AuthFlowError('Escribe tu nombre');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 160) throw new AuthFlowError('Correo electrónico inválido');
  const pwProblem = passwordProblem(input.password);
  if (pwProblem) throw new AuthFlowError(pwProblem);
  const passwordHash = await hashPassword(input.password);
  const user = await db.transaction(async (tx) => {
    const [u] = await tx.insert(users).values({ name, email, passwordHash }).onConflictDoNothing().returning({ id: users.id, email: users.email });
    if (!u) return null;
    const [buyer] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, 'buyer'));
    await tx.insert(userRoles).values({ userId: u.id, roleId: buyer.id });
    // La persona dueña de la plataforma se vuelve administradora al registrarse con ADMIN_EMAIL.
    if (process.env.ADMIN_EMAIL && email === normEmail(process.env.ADMIN_EMAIL)) {
      const [admin] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.key, 'admin'));
      await tx.insert(userRoles).values({ userId: u.id, roleId: admin.id });
    }
    return u;
  });
  // Mensaje genérico ante correo duplicado sería ideal, pero la UX de registro lo hace inviable; el límite de intentos mitiga la enumeración.
  if (!user) throw new AuthFlowError('Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.');
  await sendVerificationEmail(user.id, user.email);
  await createSession(user.id);
  await mergeGuestCart(user.id);
  await audit(user.id, 'user.registered', 'user', user.id);
  return user;
}

export async function login(input: { email: string; password: string }) {
  const email = normEmail(input.email);
  const [u] = await db.select({ id: users.id, hash: users.passwordHash, status: users.status }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  const ok = await verifyPassword(input.password, u?.hash ?? (await dummyHash()));
  if (!u || !ok) {
    await audit(u?.id ?? null, 'auth.login_failed', 'user', u?.id ?? null);
    throw new AuthFlowError('Correo o contraseña incorrectos');
  }
  if (u.status !== 'active') throw new AuthFlowError('Tu cuenta está suspendida. Contacta a soporte.');
  await createSession(u.id);
  await mergeGuestCart(u.id);
  await audit(u.id, 'auth.login', 'user', u.id);
}

export async function verifyEmail(token: string) {
  const userId = await consumeToken(token, 'verify_email');
  if (!userId) return false;
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  await audit(userId, 'user.email_verified', 'user', userId);
  return true;
}

/** Siempre responde igual exista o no la cuenta (no revela qué correos están registrados). */
export async function requestPasswordReset(emailRaw: string) {
  const email = normEmail(emailRaw);
  const [u] = await db.select({ id: users.id, email: users.email, status: users.status }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1);
  if (!u || u.status !== 'active') return;
  const token = await issueToken(u.id, 'reset_password', 60);
  await sendEmail(u.email, `Restablece tu contraseña de ${APP_NAME}`, emailLayout({
    title: 'Restablece tu contraseña', intro: 'Recibimos una solicitud para cambiar tu contraseña. El enlace vence en 1 hora. Si no fuiste tú, ignora este correo.',
    cta: { label: 'Elegir nueva contraseña', href: `/restablecer/${token}` },
  }));
  await audit(u.id, 'auth.reset_requested', 'user', u.id);
}

export async function resetPassword(token: string, password: string) {
  const problem = passwordProblem(password);
  if (problem) throw new AuthFlowError(problem);
  const userId = await consumeToken(token, 'reset_password');
  if (!userId) throw new AuthFlowError('El enlace no es válido o ya venció. Solicita uno nuevo.');
  await db.update(users).set({ passwordHash: await hashPassword(password), emailVerifiedAt: sql`coalesce(${users.emailVerifiedAt}, now())` }).where(eq(users.id, userId));
  await destroyAllSessions(userId); // cierra sesión en todos los dispositivos
  await createSession(userId);
  await audit(userId, 'auth.password_reset', 'user', userId);
}

export async function changePassword(userId: string, current: string, next: string) {
  const [u] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, userId));
  if (!u || !(await verifyPassword(current, u.hash))) throw new AuthFlowError('Tu contraseña actual no es correcta');
  const problem = passwordProblem(next);
  if (problem) throw new AuthFlowError(problem);
  await db.update(users).set({ passwordHash: await hashPassword(next) }).where(eq(users.id, userId));
  await destroyAllSessions(userId);
  await createSession(userId);
  await audit(userId, 'auth.password_changed', 'user', userId);
}
