'use server';

import { redirect } from 'next/navigation';
import { runAction, str, type ActionState, AppError } from '@/lib/errors';
import * as auth from '@/lib/services/auth';
import { destroySession, getCurrentUser } from '@/lib/auth/session';
import { assertUser } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security';

/** Solo rutas internas: evita redirecciones abiertas (?next=https://sitio-malicioso). */
const safeNext = (n: string) => (n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/\\') ? n : '/');

export async function registerAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const next = safeNext(str(fd, 'next'));
  const res = await runAction(async () => {
    if (!(await rateLimit('register', 5, 3600))) throw new AppError('Demasiados registros desde tu conexión. Intenta más tarde.');
    if (fd.get('terms') !== 'on') throw new AppError('Debes aceptar los términos y el aviso de privacidad');
    await auth.register({ name: str(fd, 'name', 80), email: str(fd, 'email', 160), password: String(fd.get('password') ?? '') });
  });
  if (res?.error) return res;
  redirect(next === '/' ? '/cuenta?bienvenida=1' : next);
}

export async function loginAction(_: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, 'email', 160).toLowerCase();
  const res = await runAction(async () => {
    // Límite por IP y por cuenta: frena ataques de fuerza bruta sin bloquear a toda una red.
    if (!(await rateLimit('login-ip', 20, 900)) || !(await rateLimit('login-acct', 8, 900, email))) {
      throw new AppError('Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.');
    }
    await auth.login({ email, password: String(fd.get('password') ?? '') });
  });
  if (res?.error) return res;
  redirect(safeNext(str(fd, 'next')));
}

export async function logoutAction() {
  await destroySession();
  redirect('/');
}

export async function forgotPasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    if (!(await rateLimit('forgot', 5, 3600))) throw new AppError('Demasiadas solicitudes. Intenta más tarde.');
    await auth.requestPasswordReset(str(fd, 'email', 160));
    return 'Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña.';
  });
}

export async function resetPasswordAction(token: string, _: ActionState, fd: FormData): Promise<ActionState> {
  const res = await runAction(async () => {
    if (!(await rateLimit('reset', 10, 3600))) throw new AppError('Demasiados intentos. Intenta más tarde.');
    if (fd.get('password') !== fd.get('confirm')) throw new AppError('Las contraseñas no coinciden');
    await auth.resetPassword(token, String(fd.get('password') ?? ''));
  });
  if (res?.error) return res;
  redirect('/cuenta?contrasena=actualizada');
}

export async function resendVerificationAction(_: ActionState): Promise<ActionState> {
  return runAction(async () => {
    const user = await assertUser();
    if (user.emailVerified) return 'Tu correo ya está confirmado';
    if (!(await rateLimit('verify-resend', 3, 3600, user.id))) throw new AppError('Ya enviamos varios correos. Revisa tu bandeja o spam.');
    await auth.sendVerificationEmail(user.id, user.email);
    return `Te enviamos un nuevo enlace a ${user.email}`;
  });
}

export async function changePasswordAction(_: ActionState, fd: FormData): Promise<ActionState> {
  return runAction(async () => {
    const user = await getCurrentUser();
    if (!user) throw new AppError('Inicia sesión');
    if (!(await rateLimit('change-pw', 5, 900, user.id))) throw new AppError('Demasiados intentos. Espera unos minutos.');
    if (fd.get('next') !== fd.get('confirm')) throw new AppError('Las contraseñas nuevas no coinciden');
    await auth.changePassword(user.id, String(fd.get('current') ?? ''), String(fd.get('next') ?? ''));
    return 'Contraseña actualizada. Cerramos tus otras sesiones por seguridad.';
  });
}
