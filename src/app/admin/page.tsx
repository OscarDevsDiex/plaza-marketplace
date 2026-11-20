import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { getOverview } from '@/lib/services/admin';
import { IntegrationList } from '@/components/admin/integrations';
import { expireOrdersAction } from '@/actions/admin';
import { AreaChart, BarList } from '@/components/ui/chart';
import { PageHeader, Stat } from '@/components/ui/misc';
import { QuickAction } from '@/components/admin/ui';
import { formatMoney } from '@/lib/utils';

export default async function AdminOverview() {
  await requireAdmin();
  const o = await getOverview();
  const n = (v: number) => v.toLocaleString('es-MX');
  const alerts = [
    { label: 'Reportes abiertos', value: o.openReports, href: '/admin/reportes' },
    { label: 'Pagos señalados', value: o.flagged, href: '/admin/pagos' },
    { label: 'Correos fallidos', value: o.failedEmails, href: '/admin/configuracion' },
  ];
  return (
    <>
      <PageHeader
        title="Resumen"
        description="Estado general del marketplace."
        actions={<QuickAction action={expireOrdersAction}>Expirar pedidos vencidos</QuickAction>}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Usuarios registrados" value={n(o.users)} />
        <Stat label="Vendedores activos" value={n(o.activeStores)} hint="Tiendas activas" />
        <Stat label="Productos publicados" value={n(o.published)} />
        <Stat label="Ventas totales" value={formatMoney(o.gmv)} hint="Pedidos pagados y completados" />
        <Stat label="Ingresos de la plataforma" value={formatMoney(o.fees)} hint="Comisiones generadas" />
        <Stat label="Pedidos completados" value={n(o.completed)} />
        <Stat label="Pedidos cancelados" value={n(o.cancelled)} />
        <Stat label="Reembolsados" value={n(o.refunded)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold">Ventas de los últimos 30 días</h2>
          <p className="mb-3 text-xs text-muted">Total de pedidos pagados por día</p>
          <AreaChart points={o.daily} money />
        </section>
        <section className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Tiendas con más ventas</h2>
          {o.topStores.length ? <BarList items={o.topStores} money /> : <p className="text-sm text-muted">Aún no hay ventas.</p>}
        </section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Atención requerida</h2>
          <ul className="divide-y divide-line">
            {alerts.map((a) => (
              <li key={a.label}>
                <Link href={a.href} className="flex items-center justify-between py-2.5 text-sm hover:text-ink">
                  <span className="flex items-center gap-2 text-ink-2">
                    <AlertTriangle className={a.value ? 'size-4 text-warning' : 'size-4 text-faint'} />{a.label}
                  </span>
                  <span className={a.value ? 'font-semibold tabular-nums text-warning' : 'tabular-nums text-muted'}>{n(a.value)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Integraciones</h2>
          <IntegrationList />
        </section>
      </div>
    </>
  );
}

