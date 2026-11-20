import Link from 'next/link';
import { and, count, desc, eq } from 'drizzle-orm';
import { CreditCard, ShieldAlert } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, flaggedPayments, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { DataTable, Filters, Section, td, tr, linkClass } from '@/components/admin/ui';
import { PROVIDER_LABELS, StatusBadge, statusOptions } from '@/components/admin/status';
import { formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

const { payments, orders } = schema;
const PROVIDERS = ['sandbox', 'stripe', 'mercadopago'] as const;
const STATUSES = ['created', 'pending', 'approved', 'rejected', 'cancelled', 'refunded', 'partially_refunded'] as const;
const FLAG_LABELS: Record<string, string> = {
  'payment.mismatch': 'El monto o la moneda no coinciden con el pedido',
  'payment.paid-but-closed': 'Pago recibido con el pedido ya cerrado: requiere reembolso',
};

export default async function AdminPayments({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const provider = oneOf(sp.proveedor, PROVIDERS), status = oneOf(sp.estado, STATUSES), page = pageOf(sp);
  const where = and(provider ? eq(payments.provider, provider) : undefined, status ? eq(payments.status, status) : undefined);
  const [flagged, rows, [{ n: total }]] = await Promise.all([
    flaggedPayments(),
    db.select({
      id: payments.id, provider: payments.provider, status: payments.status, amount: payments.amount, refunded: payments.amountRefunded,
      createdAt: payments.createdAt, orderId: orders.id, orderNumber: orders.number,
    }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(where)
      .orderBy(desc(payments.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(payments).where(where),
  ]);

  return (
    <>
      <PageHeader title="Pagos" description="Intentos de pago de todos los proveedores." />

      {flagged.length > 0 && (
        <Section title={<span className="flex items-center gap-2"><ShieldAlert className="size-4 text-danger" />Pagos señalados</span>}
          description="Detectados al verificar con el proveedor. Revisa el pedido y, si aplica, reembolsa." className="mt-0 mb-8">
          <DataTable head={['Pedido', 'Problema', 'Proveedor', 'Esperado / recibido', 'Estado actual', 'Fecha']}>
            {flagged.map((f) => {
              const m = (f.metadata ?? {}) as { expected?: number; got?: number; currency?: string };
              return (
                <tr key={f.id} className={tr}>
                  <td className={td}>{f.orderId ? <Link href={`/admin/pedidos/${f.orderId}`} className={`${linkClass} tabular-nums`}>{orderNumber(f.orderNumber!)}</Link> : <span className="text-faint">—</span>}</td>
                  <td className={`${td} text-ink-2`}>{FLAG_LABELS[f.action] ?? f.action}</td>
                  <td className={td}>{f.provider ? PROVIDER_LABELS[f.provider] : '—'}</td>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{m.expected != null ? formatMoney(m.expected) : '—'} / {m.got != null ? formatMoney(m.got) : '—'} {m.currency}</td>
                  <td className={td}>{f.status ? <StatusBadge kind="payment" value={f.status} /> : '—'}</td>
                  <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(f.createdAt)}</td>
                </tr>
              );
            })}
          </DataTable>
        </Section>
      )}

      <Filters base="/admin/pagos" total={total}
        selects={[
          { name: 'proveedor', value: provider, all: 'Todos los proveedores', options: PROVIDERS.map((p) => [p, PROVIDER_LABELS[p]]) },
          { name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('payment') },
        ]} />
      {rows.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-5" />} title="Sin pagos">No hay pagos que coincidan con los filtros.</EmptyState>
      ) : (
        <DataTable head={['Pedido', 'Proveedor', 'Estado', 'Monto', 'Reembolsado', 'Fecha']}>
          {rows.map((p) => (
            <tr key={p.id} className={tr}>
              <td className={td}><Link href={`/admin/pedidos/${p.orderId}`} className={`${linkClass} tabular-nums`}>{orderNumber(p.orderNumber)}</Link></td>
              <td className={td}>{PROVIDER_LABELS[p.provider]}</td>
              <td className={td}><StatusBadge kind="payment" value={p.status} /></td>
              <td className={`${td} tabular-nums`}>{formatMoney(p.amount)}</td>
              <td className={`${td} tabular-nums ${p.refunded ? 'text-danger' : 'text-faint'}`}>{p.refunded ? formatMoney(p.refunded) : '—'}</td>
              <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(p.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/pagos', sp)} />
    </>
  );
}
