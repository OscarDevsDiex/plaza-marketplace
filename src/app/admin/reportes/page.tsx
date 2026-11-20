import Link from 'next/link';
import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { Flag } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { REPORT_REASON_LABELS } from '@/lib/services/community';
import { resolveReportAction } from '@/actions/admin';
import { Field, Select } from '@/components/ui/form';
import { Badge, EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { ConfirmAction, Filters } from '@/components/admin/ui';
import { StatusBadge, TARGET_LABELS, statusOptions, type StatusKind } from '@/components/admin/status';
import { formatDateTime } from '@/lib/utils';

const { reports, users, products, stores, reviews } = schema;
const STATUSES = ['open', 'resolved', 'dismissed'] as const;
const TARGETS = ['product', 'review', 'store', 'user'] as const;
type Target = { label: string; href?: string; kind: StatusKind; status: string };

/** Resuelve el nombre, enlace y estado de cada objetivo reportado (una consulta por tipo). */
async function loadTargets(rows: { targetType: string; targetId: string }[]) {
  const ids = (t: string) => rows.filter((r) => r.targetType === t).map((r) => r.targetId);
  const none = Promise.resolve([]);
  const [ps, ss, rs, us] = await Promise.all([
    ids('product').length ? db.select({ id: products.id, title: products.title, slug: products.slug, status: products.status }).from(products).where(inArray(products.id, ids('product'))) : none,
    ids('store').length ? db.select({ id: stores.id, name: stores.name, slug: stores.slug, status: stores.status }).from(stores).where(inArray(stores.id, ids('store'))) : none,
    ids('review').length ? db.select({ id: reviews.id, body: reviews.body, status: reviews.status, slug: products.slug }).from(reviews).innerJoin(products, eq(products.id, reviews.productId)).where(inArray(reviews.id, ids('review'))) : none,
    ids('user').length ? db.select({ id: users.id, name: users.name, status: users.status }).from(users).where(inArray(users.id, ids('user'))) : none,
  ]);
  const map = new Map<string, Target>();
  for (const p of ps) map.set(p.id, { label: p.title, href: `/producto/${p.slug}`, kind: 'product', status: p.status });
  for (const s of ss) map.set(s.id, { label: s.name, href: `/tienda/${s.slug}`, kind: 'store', status: s.status });
  for (const r of rs) map.set(r.id, { label: `“${r.body.slice(0, 80)}${r.body.length > 80 ? '…' : ''}”`, href: `/producto/${r.slug}#resenas`, kind: 'review', status: r.status });
  for (const u of us) map.set(u.id, { label: u.name, href: `/admin/usuarios/${u.id}`, kind: 'user', status: u.status });
  return map;
}

const QUICK: Record<string, [string, string] | undefined> = {
  review: ['hide_review', 'Ocultar la reseña'],
  product: ['suspend_product', 'Suspender el producto'],
  store: ['suspend_store', 'Suspender la tienda'],
};

export default async function AdminReports({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = oneOf(sp.estado, STATUSES), target = oneOf(sp.tipo, TARGETS), page = pageOf(sp);
  const where = and(status ? eq(reports.status, status) : undefined, target ? eq(reports.targetType, target) : undefined);
  const [rows, [{ n: total }]] = await Promise.all([
    db.select({
      id: reports.id, targetType: reports.targetType, targetId: reports.targetId, reason: reports.reason, details: reports.details, status: reports.status,
      createdAt: reports.createdAt, resolvedAt: reports.resolvedAt, resolutionNote: reports.resolutionNote,
      reporterId: users.id, reporterName: users.name, reporterEmail: users.email,
    }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(where)
      .orderBy(sql`(${reports.status} = 'open') desc`, desc(reports.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(reports).where(where),
  ]);
  const targets = await loadTargets(rows);

  return (
    <>
      <PageHeader title="Reportes" description="Denuncias de la comunidad. Los abiertos aparecen primero." />
      <Filters base="/admin/reportes" total={total}
        selects={[
          { name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('report') },
          { name: 'tipo', value: target, all: 'Todos los tipos', options: TARGETS.map((t) => [t, TARGET_LABELS[t]]) },
        ]} />
      {rows.length === 0 ? (
        <EmptyState icon={<Flag className="size-5" />} title="Sin reportes">No hay reportes que coincidan con los filtros.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const t = targets.get(r.targetId);
            const quick = QUICK[r.targetType];
            return (
              <li key={r.id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge kind="report" value={r.status} />
                      <Badge>{TARGET_LABELS[r.targetType]}</Badge>
                      <span className="text-sm font-medium">{REPORT_REASON_LABELS[r.reason as keyof typeof REPORT_REASON_LABELS] ?? r.reason}</span>
                    </div>
                    <p className="text-sm">
                      {t?.href ? <Link href={t.href} target={t.href.startsWith('/admin') ? undefined : '_blank'} className="font-medium hover:underline">{t.label}</Link> : <span className="text-muted">{t?.label ?? 'Objetivo eliminado'}</span>}
                      {t && <span className="ml-2"><StatusBadge kind={t.kind} value={t.status} /></span>}
                    </p>
                    {r.details && <p className="text-sm text-ink-2 whitespace-pre-line">{r.details}</p>}
                    <p className="text-xs text-muted">
                      Por <Link href={`/admin/usuarios/${r.reporterId}`} className="hover:underline">{r.reporterName}</Link> ({r.reporterEmail}) · {formatDateTime(r.createdAt)}
                    </p>
                    {r.status !== 'open' && (
                      <p className="text-xs text-muted">Cerrado el {r.resolvedAt ? formatDateTime(r.resolvedAt) : '—'}{r.resolutionNote ? ` · ${r.resolutionNote}` : ''}</p>
                    )}
                  </div>
                  {r.status === 'open' && (
                    <div className="flex flex-wrap gap-2">
                      <ConfirmAction action={resolveReportAction.bind(null, r.id)} label="Resolver" variant="primary" hidden={{ outcome: 'resolved' }}
                        reason={{ label: 'Nota (obligatoria si suspendes: se envía a la tienda)' }}>
                        {quick && t && (
                          <Field label="Acción sobre el objetivo">
                            <Select name="quick" defaultValue="" className="h-9">
                              <option value="">Ninguna</option>
                              <option value={quick[0]}>{quick[1]}</option>
                            </Select>
                          </Field>
                        )}
                      </ConfirmAction>
                      <ConfirmAction action={resolveReportAction.bind(null, r.id)} label="Descartar" variant="secondary" hidden={{ outcome: 'dismissed' }}
                        reason={{ label: 'Nota (opcional)' }} />
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/reportes', sp)} />
    </>
  );
}
