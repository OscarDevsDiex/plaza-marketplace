import type { Metadata } from 'next';
import { resetPasswordAction } from '@/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input } from '@/components/ui/form';
import { PASSWORD_RULES } from '@/lib/services/auth-rules';

export const metadata: Metadata = { title: 'Nueva contraseña', robots: { index: false }, referrer: 'no-referrer' };

export default async function ResetPage(props: PageProps<'/restablecer/[token]'>) {
  const { token } = await props.params;
  return (
    <AuthCard title="Elige una nueva contraseña" subtitle="Al guardarla cerraremos tu sesión en los demás dispositivos.">
      <ActionForm action={resetPasswordAction.bind(null, token)} className="space-y-4">
        <Field label="Nueva contraseña" htmlFor="password" hint={PASSWORD_RULES}><Input id="password" name="password" type="password" autoComplete="new-password" required minLength={10} autoFocus /></Field>
        <Field label="Confírmala" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} /></Field>
        <SubmitButton size="lg" className="w-full" pendingText="Guardando…">Guardar contraseña</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
