import Link from 'next/link';
import { Boxes, CircleCheck, Info, Package, PackageCheck, Receipt, Star, Truck, Wallet } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { getDashboard } from '@/lib/services/seller/queries';
import { AreaChart, BarList } from '@/components/ui/chart';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState, PageHeader, Stat, Stars } from '@/components/ui/misc';
import { Card, OrderStatusBadge, param, td, th, type SP } from '@/components/seller/ui';
import { formatDate, formatMoney, orderNumber } from '@/lib/utils';

export const metadata = { title: 'Resumen' };

export default async function SellerDashboard({ searchParams }: { searchParams: SP }) {
  const { store } = await requireSeller();
  const welcome = param(await searchParams, 'bienvenida') === '1';
  const { kpi, products, series, top, latest, rating } = await getDashboard(store.id);

  return (
    <>
      <PageHeader title="Resumen" description={`Así va ${store.name}.`}
        actions={<ButtonLink href="/vendedor/productos/nuevo" variant="brand">Publicar producto</ButtonLink>} />

      {welcome && (
        <div className="card mb-6 flex flex-wrap items-center gap-4 p-5 animate-fade-up">
          <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success"><CircleCheck className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">¡Tu tienda está lista!</p>
            <p className="text-sm text-muted">Siguientes pasos: publica tu primer producto, sube el logo de tu tienda y revisa tus costos de envío.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/vendedor/tienda" variant="secondary" size="sm">Personalizar tienda</ButtonLink>
            <ButtonLink href="/vendedor/configuracion" variant="secondary" size="sm">Configurar envíos</ButtonLink>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ventas totales" value={formatMoney(kpi.sales)} icon={<Receipt className="size-4" />} hint="Pedidos pagados, en preparación, enviados y entregados" />
        <Stat label="Ingresos netos" value={formatMoney(kpi.net)} icon={<Wallet className="size-4" />} hint={`Comisiones: ${formatMoney(kpi.commission)}`} />
        <Stat label="Por preparar" value={<Link href="/vendedor/pedidos?estado=preparar" className="hover:underline">{kpi.toPrepare}</Link>} icon={<PackageCheck className="size-4" />} hint="Pagados o en preparación" />
        <Stat label="Enviados" value={kpi.shipped} icon={<Truck className="size-4" />} hint="En camino al comprador" />
        <Stat label="Productos publicados" value={products.active} icon={<Package className="size-4" />} />
        <Stat label="Agotados" value={<Link href="/vendedor/inventario?filtro=agotados" className={products.outOfStock ? 'text-danger hover:underline' : 'hover:underline'}>{products.outOfStock}</Link>}
          icon={<Boxes className="size-4" />} hint="Publicados sin existencias" />
        <Stat label="Calificación" value={rating.ratingCount ? <span className="flex items-center gap-2">{Number(rating.ratingAvg).toFixed(1)}<Stars value={Number(rating.ratingAvg)} /></span> : '—'}
          icon={<Star className="size-4" />} hint={rating.ratingCount ? `${rating.ratingCount} reseñas` : 'Aún sin reseñas'} />
        <Stat label="Saldo retenido" value={formatMoney(kpi.held)} icon={<Wallet className="size-4" />} hint="Pendiente de liquidación" />
      </div>

      <p className="mt-3 flex items-start gap-2 rounded-lg bg-info-soft px-3 py-2 text-xs text-info">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        Tu saldo queda retenido mientras habilitamos las liquidaciones a vendedores. Te avisaremos cuando puedas recibir tus pagos; no necesitas hacer nada por ahora.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card title="Ventas de los últimos 30 días" className="lg:col-span-2" action={<Link href="/vendedor/estadisticas" className="text-xs text-muted hover:text-ink">Ver estadísticas</Link>}>
          <AreaChart points={series} money />
        </Card>
        <Card title="Productos más vendidos">
          {top.length ? <BarList items={top} money /> : <p className="py-10 text-center text-sm text-muted">Aún no hay ventas.</p>}
        </Card>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Pedidos recientes</h2><Link href="/vendedor/pedidos" className="text-xs text-muted hover:text-ink">Ver todos</Link></div>
        {latest.length ? (
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr><th className={th}>Pedido</th><th className={th}>Fecha</th><th className={th}>Comprador</th><th className={th}>Artículos</th><th className={th}>Total</th><th className={th}>Estado</th></tr></thead>
              <tbody>
                {latest.map((o) => (
                  <tr key={o.id} className="border-t border-line hover:bg-subtle/60">
                    <td className={td}><Link href={`/vendedor/pedidos/${o.id}`} className="font-medium hover:underline">{orderNumber(o.number)}</Link></td>
                    <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(o.createdAt)}</td>
                    <td className={td}>{o.buyerName}</td>
                    <td className={`${td} tabular-nums`}>{o.items}</td>
                    <td className={`${td} tabular-nums font-medium`}>{formatMoney(o.total)}</td>
                    <td className={td}><OrderStatusBadge status={o.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={<Receipt className="size-5" />} title="Todavía no tienes pedidos">
            Cuando alguien compre tus productos, aparecerán aquí.
          </EmptyState>
        )}
      </div>
    </>
  );
}
