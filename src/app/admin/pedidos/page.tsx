import Link from 'next/link';
import { and, count, desc, eq, ilike, sql } from 'drizzle-orm';
import { ShoppingBag } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, likeTerm, one, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { DataTable, Filters, td, tr, linkClass } from '@/components/admin/ui';
import { StatusBadge, statusOptions } from '@/components/admin/status';
import { formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

const { orders, sellerOrders } = schema;
const STATUSES = ['pending_payment', 'paid', 'completed', 'cancelled', 'refunded'] as const;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q), status = oneOf(sp.estado, STATUSES), page = pageOf(sp);
  // "PZ-100123", "100123" → número de pedido; cualquier otra cosa se busca en el correo del comprador.
  const num = /^(pz-?)?\d{1,15}$/i.test(q) ? Number(q.replace(/\D/g, '')) : null;
  const where = and(
    q ? (num != null ? eq(orders.number, num) : ilike(orders.buyerEmail, likeTerm(q))) : undefined,
    status ? eq(orders.status, status) : undefined,
  );
  const [rows, [{ n: total }]] = await Promise.all([
    db.select({
      id: orders.id, number: orders.number, status: orders.status, total: orders.total, createdAt: orders.createdAt,
      buyerName: orders.buyerName, buyerEmail: orders.buyerEmail,
      stores: sql<number>`(select count(*)::int from ${sellerOrders} where ${sellerOrders.orderId} = "orders"."id")`,
    }).from(orders).where(where).orderBy(desc(orders.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(orders).where(where),
  ]);

  return (
    <>
      <PageHeader title="Pedidos" description="Todos los pedidos del marketplace." />
      <Filters base="/admin/pedidos" q={q} placeholder="Número (PZ-…) o correo del comprador" total={total}
        selects={[{ name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('order') }]} />
      {rows.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="size-5" />} title="Sin pedidos">No hay pedidos que coincidan con los filtros.</EmptyState>
      ) : (
        <DataTable head={['Pedido', 'Comprador', 'Tiendas', 'Estado', 'Total', 'Fecha']}>
          {rows.map((o) => (
            <tr key={o.id} className={tr}>
              <td className={td}><Link href={`/admin/pedidos/${o.id}`} className={`${linkClass} tabular-nums`}>{orderNumber(o.number)}</Link></td>
              <td className={td}><div>{o.buyerName}</div><div className="text-xs text-muted">{o.buyerEmail}</div></td>
              <td className={`${td} tabular-nums`}>{o.stores}</td>
              <td className={td}><StatusBadge kind="order" value={o.status} /></td>
              <td className={`${td} tabular-nums`}>{formatMoney(o.total)}</td>
              <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(o.createdAt)}</td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/pedidos', sp)} />
    </>
  );
}
