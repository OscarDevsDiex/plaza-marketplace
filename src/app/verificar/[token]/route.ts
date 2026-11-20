import { NextResponse } from 'next/server';
import { verifyEmail } from '@/lib/services/auth';
import { APP_URL } from '@/lib/config';

/** Enlace del correo de verificación: consume el token (un solo uso) y redirige con el resultado. */
export async function GET(_req: Request, ctx: RouteContext<'/verificar/[token]'>) {
  const { token } = await ctx.params;
  const ok = await verifyEmail(token);
  const res = NextResponse.redirect(`${APP_URL}/cuenta?correo=${ok ? 'verificado' : 'invalido'}`);
  res.headers.set('Referrer-Policy', 'no-referrer');
  return res;
}
