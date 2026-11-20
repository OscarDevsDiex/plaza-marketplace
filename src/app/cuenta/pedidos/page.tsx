import type { Metadata } from 'next';
import Link from 'next/link';
import { Package } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { listBuyerOrders } from '@/lib/services/account';
import { StatusBadge } from '@/components/order-status';
import { EmptyState, PageHeader } from '@/components/ui/misc';
import { ButtonLink } from '@/components/ui/button';
import { formatDate, formatMoney, orderNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Mis compras' };

export default async function OrdersPage() {
  const user = await requireUser('/cuenta/pedidos');
  const orders = await listBuyerOrders(user.id);
  return (
    <>
      <PageHeader title="Mis compras" description="Sigue tus pedidos, confirma entregas y califica lo que recibiste." />
      {orders.length === 0 ? (
        <EmptyState icon={<Package className="size-5" />} title="Aún no tienes compras" action={<ButtonLink href="/">Explorar productos</ButtonLink>} />
      ) : (
        <ul className="space-y-4">
          {orders.map((o) => (
            <li key={o.id} className="card overflow-hidden">
              <Link href={`/cuenta/pedidos/${o.id}`} className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-subtle/50 px-5 py-3 text-sm hover:bg-subtle">
                <span className="flex flex-wrap items-center gap-x-4 gap-y-1"><span className="font-medium">{orderNumber(o.number)}</span><span className="text-muted">{formatDate(o.createdAt)}</span><span className="tabular-nums">{formatMoney(o.total)}</span></span>
                <span className="flex items-center gap-3"><StatusBadge status={o.status} /><span className="text-muted">Ver detalle →</span></span>
              </Link>
              <ul className="divide-y divide-line">
                {o.sellerOrders.map((so) => (
                  <li key={so.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="flex -space-x-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {so.items.slice(0, 3).map((i) => <img key={i.id} src={i.imageUrl ?? ''} alt="" className="size-12 rounded-lg bg-subtle object-cover ring-2 ring-surface" />)}
                    </div>
                    <div className="min-w-0 flex-1 text-sm"><div className="truncate">{so.items.map((i) => i.title).join(', ')}</div><div className="text-xs text-muted">Vendido por {so.storeName}</div></div>
                    <StatusBadge status={so.status} />
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
