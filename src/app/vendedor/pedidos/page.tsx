import Link from 'next/link';
import { Receipt } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { listOrders, PAGE_SIZE, type SellerOrderStatus } from '@/lib/services/seller/queries';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { FilterTabs, OrderStatusBadge, pageParam, param, td, th, withQuery, type SP } from '@/components/seller/ui';
import { ORDER_STATUS } from '@/components/seller/constants';
import { cn, formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

export const metadata = { title: 'Pedidos' };

const TABS: { key: string; label: string; statuses?: SellerOrderStatus[] }[] = [
  { key: '', label: 'Todos' },
  { key: 'preparar', label: 'Por preparar', statuses: ['paid', 'processing'] },
  ...(['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'pending_payment'] as const).map((s) => ({ key: s, label: ORDER_STATUS[s].label, statuses: [s] })),
];

export default async function SellerOrders({ searchParams }: { searchParams: SP }) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === param(sp, 'estado')) ?? TABS[0];
  const page = pageParam(sp);
  const { items, total, counts } = await listOrders(store.id, { status: tab.statuses, page });
  const count = (t: (typeof TABS)[number]) => (t.statuses ?? ['paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded']).reduce((n, s) => n + (counts[s] ?? 0), 0);

  return (
    <>
      <PageHeader title="Pedidos" description="Prepara y envía tus pedidos pagados. La dirección del comprador aparece cuando el pago está confirmado." />
      <FilterTabs items={TABS.map((t) => ({ label: t.label, href: withQuery('/vendedor/pedidos', { estado: t.key }), active: t === tab, count: count(t) }))} />
      {items.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr><th className={th}>Pedido</th><th className={th}>Fecha</th><th className={th}>Comprador</th><th className={th}>Artículos</th><th className={th}>Total</th><th className={th}>Estado</th><th className={th} /></tr></thead>
            <tbody>
              {items.map((o) => (
                <tr key={o.id} className="border-t border-line hover:bg-subtle/60">
                  <td className={td}><Link href={`/vendedor/pedidos/${o.id}`} className="font-medium hover:underline">{orderNumber(o.number)}</Link></td>
                  <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDateTime(o.createdAt)}</td>
                  <td className={td}>{o.buyerName}</td>
                  <td className={cn(td, 'tabular-nums')}>{o.items}</td>
                  <td className={cn(td, 'tabular-nums font-medium')}>{formatMoney(o.total)}</td>
                  <td className={td}><OrderStatusBadge status={o.status} /></td>
                  <td className={cn(td, 'text-right')}><Link href={`/vendedor/pedidos/${o.id}`} className="text-sm text-muted hover:text-ink">{o.status === 'paid' || o.status === 'processing' ? 'Preparar →' : 'Ver →'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Receipt className="size-5" />} title={tab.key ? 'No hay pedidos con este estado' : 'Todavía no tienes pedidos'}
          action={tab.key ? <ButtonLink href="/vendedor/pedidos" variant="secondary">Ver todos</ButtonLink> : undefined}>
          {tab.key ? 'Prueba con otro filtro.' : 'Cuando alguien compre tus productos, aparecerán aquí.'}
        </EmptyState>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={(n) => withQuery('/vendedor/pedidos', { estado: tab.key, pagina: n })} />
    </>
  );
}
