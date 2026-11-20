import Link from 'next/link';
import { and, asc, count, desc, eq, ilike, like } from 'drizzle-orm';
import { ScrollText } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, likeTerm, one, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { DataTable, td, tr } from '@/components/admin/ui';
import { Input, Select } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import Form from 'next/form';

const { auditLogs, users } = schema;

export default async function AdminAudit({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const action = one(sp.accion), entity = one(sp.entidad), actor = one(sp.actor), page = pageOf(sp);
  const where = and(
    action ? like(auditLogs.action, likeTerm(action, true)) : undefined,
    entity ? eq(auditLogs.entityType, entity) : undefined,
    actor ? ilike(users.email, likeTerm(actor)) : undefined,
  );
  const [rows, [{ n: total }], entities] = await Promise.all([
    db.select({
      id: auditLogs.id, action: auditLogs.action, entityType: auditLogs.entityType, entityId: auditLogs.entityId, metadata: auditLogs.metadata,
      ip: auditLogs.ip, createdAt: auditLogs.createdAt, actorId: auditLogs.actorId, actorEmail: users.email,
    }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where)
      .orderBy(desc(auditLogs.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(auditLogs).leftJoin(users, eq(users.id, auditLogs.actorId)).where(where),
    db.selectDistinct({ v: auditLogs.entityType }).from(auditLogs).orderBy(asc(auditLogs.entityType)),
  ]);
  const active = action || entity || actor;

  return (
    <>
      <PageHeader title="Auditoría" description="Registro inmutable de acciones sensibles." />
      <Form action="/admin/auditoria" className="mb-4 flex flex-wrap items-center gap-2">
        <Input name="accion" defaultValue={action} placeholder="Acción (prefijo, ej. payment.)" aria-label="Acción" className="h-9 w-full font-mono sm:w-56" />
        <Select name="entidad" defaultValue={entity} aria-label="Entidad" className="h-9 w-auto min-w-36">
          <option value="">Todas las entidades</option>
          {entities.map((e) => <option key={e.v} value={e.v}>{e.v}</option>)}
        </Select>
        <Input name="actor" defaultValue={actor} placeholder="Correo de quien actuó" aria-label="Correo del actor" className="h-9 w-full sm:w-56" />
        <Button type="submit" variant="secondary" size="sm" className="h-9">Filtrar</Button>
        {active && <Link href="/admin/auditoria" className="px-2 text-sm text-muted hover:text-ink">Limpiar</Link>}
        <span className="ml-auto text-xs text-muted tabular-nums">{total.toLocaleString('es-MX')} resultados</span>
      </Form>
      {rows.length === 0 ? (
        <EmptyState icon={<ScrollText className="size-5" />} title="Sin registros">No hay entradas que coincidan con los filtros.</EmptyState>
      ) : (
        <DataTable head={['Fecha', 'Acción', 'Entidad', 'Actor', 'Detalles', 'IP']}>
          {rows.map((l) => {
            const meta = l.metadata ? JSON.stringify(l.metadata) : '';
            return (
              <tr key={l.id} className={tr}>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(l.createdAt)}</td>
                <td className={`${td} whitespace-nowrap font-mono text-xs`}>{l.action}</td>
                <td className={`${td} whitespace-nowrap text-xs`}>{l.entityType}{l.entityId && <span className="ml-1 font-mono text-faint" title={l.entityId}>{l.entityId.slice(0, 8)}</span>}</td>
                <td className={`${td} text-xs`}>{l.actorId ? <Link href={`/admin/usuarios/${l.actorId}`} className="hover:underline">{l.actorEmail}</Link> : <span className="text-muted">Sistema</span>}</td>
                <td className={`${td} max-w-sm`}><code className="block truncate font-mono text-xs text-muted" title={meta}>{meta || '—'}</code></td>
                <td className={`${td} font-mono text-xs text-faint`}>{l.ip ?? '—'}</td>
              </tr>
            );
          })}
        </DataTable>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/auditoria', sp)} />
    </>
  );
}
