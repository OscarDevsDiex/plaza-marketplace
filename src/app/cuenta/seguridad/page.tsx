import type { Metadata } from 'next';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { changePasswordAction, resendVerificationAction, logoutAction } from '@/actions/auth';
import { updateProfileAction } from '@/actions/account';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/misc';
import { PASSWORD_RULES } from '@/lib/services/auth-rules';
import { needsEmailCheck } from '@/lib/config';

export const metadata: Metadata = { title: 'Seguridad' };

export default async function SecurityPage() {
  const user = await requireUser('/cuenta/seguridad');
  return (
    <div className="max-w-2xl space-y-6">
      <PageHeader title="Perfil y seguridad" />
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Perfil</h2>
        <ActionForm action={updateProfileAction} className="mt-4 space-y-4">
          <Field label="Nombre" htmlFor="name"><Input id="name" name="name" defaultValue={user.name} required /></Field>
          <Field label="Correo" hint={user.emailVerified ? undefined : 'Sin confirmar'}>
            <div className="flex items-center gap-2 text-sm">{user.email} {user.emailVerified ? <CheckCircle2 className="size-4 text-success" aria-label="Confirmado" /> : <MailWarning className="size-4 text-warning" />}</div>
          </Field>
          <SubmitButton variant="secondary">Guardar</SubmitButton>
        </ActionForm>
        {needsEmailCheck(user) && <ActionForm action={resendVerificationAction} className="mt-3"><SubmitButton variant="link" size="sm">Reenviar correo de confirmación</SubmitButton></ActionForm>}
      </section>
      <section className="card p-5 sm:p-6">
        <h2 className="font-semibold">Cambiar contraseña</h2>
        <p className="mt-1 text-sm text-muted">Al cambiarla cerraremos tu sesión en los demás dispositivos.</p>
        <ActionForm action={changePasswordAction} resetOnSuccess className="mt-4 space-y-4">
          <Field label="Contraseña actual" htmlFor="current"><Input id="current" name="current" type="password" autoComplete="current-password" required /></Field>
          <Field label="Nueva contraseña" htmlFor="next" hint={PASSWORD_RULES}><Input id="next" name="next" type="password" autoComplete="new-password" required minLength={10} /></Field>
          <Field label="Confirma la nueva contraseña" htmlFor="confirm"><Input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={10} /></Field>
          <SubmitButton>Actualizar contraseña</SubmitButton>
        </ActionForm>
      </section>
      <section className="card flex items-center justify-between p-5 sm:p-6">
        <div><h2 className="font-semibold">Cerrar sesión</h2><p className="text-sm text-muted">En este dispositivo.</p></div>
        <form action={logoutAction}><SubmitButton variant="secondary">Cerrar sesión</SubmitButton></form>
      </section>
    </div>
  );
}
