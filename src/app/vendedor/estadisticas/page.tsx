import { Package, Receipt, ShoppingBag, TrendingUp } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { getStats } from '@/lib/services/seller/queries';
import { AreaChart, BarList } from '@/components/ui/chart';
import { PageHeader, Stat } from '@/components/ui/misc';
import { Card, FilterTabs, OrderStatusBadge, param, type SP } from '@/components/seller/ui';
import { formatMoney } from '@/lib/utils';

export const metadata = { title: 'Estadísticas' };

const PERIODS = [7, 30, 90] as const;

export default async function SellerStats({ searchParams }: { searchParams: SP }) {
  const { store } = await requireSeller();
  const raw = Number(param(await searchParams, 'dias'));
  const days = PERIODS.find((p) => p === raw) ?? 30;
  const s = await getStats(store.id, days);
  const empty = <p className="py-8 text-center text-sm text-muted">Sin ventas en este periodo.</p>;

  return (
    <>
      <PageHeader title="Estadísticas" description={`Últimos ${days} días. Solo cuentan pedidos pagados, en preparación, enviados o entregados.`} />
      <FilterTabs items={PERIODS.map((p) => ({ label: `${p} días`, href: `/vendedor/estadisticas?dias=${p}`, active: p === days }))} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ingresos" value={formatMoney(s.revenue)} icon={<TrendingUp className="size-4" />} hint={`Neto: ${formatMoney(s.net)}`} />
        <Stat label="Pedidos" value={s.orders.toLocaleString('es-MX')} icon={<ShoppingBag className="size-4" />} />
        <Stat label="Ticket promedio" value={formatMoney(s.orders ? Math.round(s.revenue / s.orders) : 0)} icon={<Receipt className="size-4" />} />
        <Stat label="Unidades vendidas" value={s.units.toLocaleString('es-MX')} icon={<Package className="size-4" />} />
      </div>

      <Card title="Ingresos por día" className="mt-6"><AreaChart points={s.series} money /></Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Productos más vendidos">{s.top.length ? <BarList items={s.top} money /> : empty}</Card>
        <Card title="Ventas por categoría">{s.byCategory.length ? <BarList items={s.byCategory} money /> : empty}</Card>
        <Card title="Pedidos por estado">
          {s.byStatus.length ? (
            <ul className="space-y-2 text-sm">
              {s.byStatus.sort((a, b) => b.count - a.count).map((r) => (
                <li key={r.status} className="flex items-center justify-between"><OrderStatusBadge status={r.status} /><span className="tabular-nums font-medium">{r.count}</span></li>
              ))}
            </ul>
          ) : <p className="py-8 text-center text-sm text-muted">Sin pedidos en este periodo.</p>}
        </Card>
      </div>
    </>
  );
}
