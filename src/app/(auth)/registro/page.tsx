import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { registerAction } from '@/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Checkbox, Field, Input } from '@/components/ui/form';
import { PASSWORD_RULES } from '@/lib/services/auth-rules';

export const metadata: Metadata = { title: 'Crear cuenta', robots: { index: false } };

export default async function RegisterPage(props: PageProps<'/registro'>) {
  const { next } = await props.searchParams;
  const target = typeof next === 'string' && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  if (await getCurrentUser()) redirect('/cuenta');
  return (
    <AuthCard
      title="Crea tu cuenta"
      subtitle="Compra con protección y, cuando quieras, abre tu tienda con la misma cuenta."
      footer={<>¿Ya tienes cuenta? <Link href={`/entrar${target !== '/' ? `?next=${encodeURIComponent(target)}` : ''}`} className="link">Inicia sesión</Link></>}
    >
      <ActionForm action={registerAction} className="space-y-4">
        <input type="hidden" name="next" value={target} />
        <Field label="Nombre completo" htmlFor="name"><Input id="name" name="name" autoComplete="name" required minLength={2} maxLength={80} autoFocus /></Field>
        <Field label="Correo electrónico" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
        <Field label="Contraseña" htmlFor="password" hint={PASSWORD_RULES}><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} /></Field>
        <Checkbox name="terms" required label={<>Acepto los <Link href="/legal/terminos" className="link" target="_blank">términos y condiciones</Link> y el <Link href="/legal/privacidad" className="link" target="_blank">aviso de privacidad</Link>.</>} />
        <SubmitButton size="lg" className="w-full" pendingText="Creando tu cuenta…">Crear cuenta</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
