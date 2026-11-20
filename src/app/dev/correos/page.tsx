import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { desc } from 'drizzle-orm';
import { db, schema, requestData } from '@/lib/db';
import { IS_PROD } from '@/lib/config';
import { Badge, PageHeader } from '@/components/ui/misc';
import { formatDateTime } from '@/lib/utils';

export const metadata: Metadata = { title: 'Buzón de desarrollo', robots: { index: false } };

/**
 * SOLO DESARROLLO: muestra los correos capturados (sin RESEND_API_KEY no se envían).
 * Sirve para abrir los enlaces de verificación y recuperación en local. En producción responde 404.
 */
export default async function DevMailbox() {
  if (IS_PROD) notFound();
  await requestData();
  const mails = await db.select().from(schema.emailOutbox).orderBy(desc(schema.emailOutbox.createdAt)).limit(30);
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <PageHeader title="Buzón de desarrollo" description="Correos generados por la aplicación. Esta página no existe en producción." />
      {mails.length === 0 && <p className="text-sm text-muted">Aún no se ha generado ningún correo.</p>}
      <ul className="space-y-6">
        {mails.map((m) => (
          <li key={m.id} className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 text-sm">
              <div><span className="font-medium">{m.subject}</span><span className="ml-2 text-muted">→ {m.to}</span></div>
              <div className="flex items-center gap-2 text-xs text-muted">{formatDateTime(m.createdAt)} <Badge>{m.status}</Badge></div>
            </div>
            {/* sandbox sin scripts: el HTML del correo no puede ejecutar código en esta página */}
            <iframe title={m.subject} srcDoc={m.html} sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" className="h-80 w-full bg-white" />
          </li>
        ))}
      </ul>
    </main>
  );
}
