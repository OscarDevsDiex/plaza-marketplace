import { AppError } from '@/lib/errors';
import 'server-only';
import { redirect, notFound } from 'next/navigation';
import { getCurrentUser, type CurrentUser, type Role } from './session';

/**
 * Capa de acceso a datos: toda página, Server Action o Route Handler protegida llama a una de estas
 * funciones cerca de los datos. Ocultar un botón en la interfaz no es una medida de seguridad.
 */
export async function requireUser(next?: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar${next ? `?next=${encodeURIComponent(next)}` : ''}`);
  return user;
}

export const hasRole = (user: CurrentUser | null, role: Role) => !!user?.roles.includes(role);

export async function requireAdmin() {
  const user = await requireUser('/admin');
  if (!hasRole(user, 'admin')) notFound(); // no revelamos que la ruta existe
  return user;
}

/** Vendedor con tienda activa. Devuelve el usuario y su tienda (todas las consultas del vendedor se filtran por store.id). */
export async function requireSeller() {
  const user = await requireUser('/vendedor');
  if (!user.store || !hasRole(user, 'seller')) redirect('/vender');
  return { user, store: user.store };
}

/** Para Server Actions: lanza un error en vez de redirigir. */
export class AuthError extends AppError {}
export async function assertUser() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Inicia sesión para continuar');
  return user;
}
export async function assertSeller() {
  const user = await assertUser();
  if (!user.store || !hasRole(user, 'seller')) throw new AuthError('Necesitas una tienda activa');
  if (user.store.status !== 'active') throw new AuthError('Tu tienda está suspendida');
  return { user, store: user.store };
}
export async function assertAdmin() {
  const user = await assertUser();
  if (!hasRole(user, 'admin')) throw new AuthError('No autorizado');
  return user;
}
