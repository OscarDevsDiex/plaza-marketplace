import type { Metadata } from 'next';
import Link from 'next/link';
import { forgotPasswordAction } from '@/actions/auth';
import { AuthCard } from '@/components/auth/auth-card';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input } from '@/components/ui/form';

export const metadata: Metadata = { title: 'Recuperar contraseña', robots: { index: false } };

export default function ForgotPage() {
  return (
    <AuthCard title="Recupera tu contraseña" subtitle="Te enviaremos un enlace para elegir una nueva. Vence en 1 hora." footer={<Link href="/entrar" className="link">Volver a iniciar sesión</Link>}>
      <ActionForm action={forgotPasswordAction} className="space-y-4" resetOnSuccess>
        <Field label="Correo electrónico" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required autoFocus /></Field>
        <SubmitButton size="lg" className="w-full" pendingText="Enviando…">Enviar enlace</SubmitButton>
      </ActionForm>
    </AuthCard>
  );
}
