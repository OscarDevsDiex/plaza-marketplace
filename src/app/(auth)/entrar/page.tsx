import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { loginAction } from '@/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input } from '@/components/ui/form';

export const metadata: Metadata = { title: 'Iniciar sesión', robots: { index: false } };

export default async function LoginPage(props: PageProps<'/entrar'>) {
  const { next } = await props.searchParams;
  const target = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (await getCurrentUser()) redirect(target);
  return (
    <AuthCard
      title="Inicia sesión"
      subtitle="Con una sola cuenta compras y vendes."
      footer={<>¿No tienes cuenta? <Link href={`/registro${target !== '/' ? `?next=${encodeURIComponent(target)}` : ''}`} className="link">Créala gratis</Link></>}
    >
      <ActionForm action={loginAction} className="space-y-4">
        <input type="hidden" name="next" value={target} />
        <Field label="Correo electrónico" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required autoFocus /></Field>
        <Field label={<span className="flex justify-between">Contraseña <Link href="/recuperar" className="font-normal text-muted hover:text-ink">¿La olvidaste?</Link></span>} htmlFor="password">
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton size="lg" className="w-full" pendingText="Entrando…">Entrar</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
