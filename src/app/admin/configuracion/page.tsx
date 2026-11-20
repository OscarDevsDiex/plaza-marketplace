import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { Mail } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { IS_PROD } from '@/lib/config';
import { saveSettingsAction } from '@/actions/admin';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input } from '@/components/ui/form';
import { EmptyState, PageHeader } from '@/components/ui/misc';
import { DataTable, Section, td, tr } from '@/components/admin/ui';
import { IntegrationList } from '@/components/admin/integrations';
import { StatusBadge } from '@/components/admin/status';
import { formatDateTime } from '@/lib/utils';

const { platformSettings, emailOutbox } = schema;

export default async function AdminSettings() {
  await requireAdmin();
  const [[support], emails] = await Promise.all([
    db.select({ value: platformSettings.value }).from(platformSettings).where(eq(platformSettings.key, 'supportEmail')),
    db.select({ id: emailOutbox.id, to: emailOutbox.to, subject: emailOutbox.subject, status: emailOutbox.status, error: emailOutbox.error, createdAt: emailOutbox.createdAt })
      .from(emailOutbox).orderBy(desc(emailOutbox.createdAt)).limit(20),
  ]);

  return (
    <>
      <PageHeader title="Configuración" description="Ajustes de la plataforma e integraciones." />
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">General</h2>
          <ActionForm action={saveSettingsAction} className="space-y-4">
            <Field label="Correo de soporte" htmlFor="supportEmail" hint="Dirección de contacto para compradores y vendedores.">
              <Input id="supportEmail" name="supportEmail" type="email" required defaultValue={typeof support?.value === 'string' ? support.value : ''} />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </section>
        <section className="card p-5">
          <h2 className="mb-1 text-sm font-semibold">Integraciones</h2>
          <p className="mb-2 text-xs text-muted">Se configuran con variables de entorno en el servidor.</p>
          <IntegrationList />
        </section>
      </div>

      <Section title="Correos recientes" description="Últimos 20 correos de la bandeja de salida."
        actions={!IS_PROD ? <Link href="/dev/correos" className="text-sm text-muted hover:text-ink">Ver correos capturados →</Link> : undefined}>
        {emails.length === 0 ? (
          <EmptyState icon={<Mail className="size-5" />} title="Sin correos">Todavía no se ha enviado ningún correo.</EmptyState>
        ) : (
          <DataTable head={['Para', 'Asunto', 'Estado', 'Fecha']}>
            {emails.map((e) => (
              <tr key={e.id} className={tr}>
                <td className={`${td} text-ink-2`}>{e.to}</td>
                <td className={`${td} max-w-sm`}>
                  <div className="truncate">{e.subject}</div>
                  {e.error && <div className="truncate text-xs text-danger" title={e.error}>{e.error}</div>}
                </td>
                <td className={td}><StatusBadge kind="email" value={e.status} /></td>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(e.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        )}
      </Section>
    </>
  );
}
