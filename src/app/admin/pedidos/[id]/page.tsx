import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guards';
import { db } from '@/lib/db';
import { isUuid } from '@/lib/services/admin';
import { refundOrderAction } from '@/actions/admin';
import { BackLink } from '@/components/dashboard-shell';
import { PageHeader } from '@/components/ui/misc';
import { ConfirmAction, DataTable, PublicLink, Section, td, tr } from '@/components/admin/ui';
import { PROVIDER_LABELS, StatusBadge } from '@/components/admin/status';
import { formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

export default async function AdminOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const order = await db.query.orders.findFirst({
    where: (o, { eq }) => eq(o.id, id),
    with: {
      sellerOrders: { with: { store: true, items: true, shipment: true } },
      payments: { orderBy: (p, { asc }) => [asc(p.createdAt)], with: { transactions: { orderBy: (t, { asc }) => [asc(t.createdAt)] } } },
    },
  });
  if (!order) notFound();
  const a = order.shippingAddress;
  const canRefund = order.status !== 'refunded' && order.payments.some((p) => p.status === 'approved');
  const fees = order.sellerOrders.reduce((t, so) => t + so.commissionAmount, 0);

  return (
    <>
      <BackLink href="/admin/pedidos">Pedidos</BackLink>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2 tabular-nums">{orderNumber(order.number)} <StatusBadge kind="order" value={order.status} /></span>}
        description={`Creado el ${formatDateTime(order.createdAt)}${order.paidAt ? ` · pagado el ${formatDateTime(order.paidAt)}` : ''}`}
        actions={canRefund && (
          <ConfirmAction action={refundOrderAction.bind(null, order.id)} label="Reembolsar pedido" submit="Solicitar reembolso"
            confirm={`Reembolsar ${formatMoney(order.total)} al comprador. Esta acción no se puede deshacer.`} />
        )}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Comprador</h2>
          <Link href={`/admin/usuarios/${order.buyerId}`} className="font-medium hover:underline">{order.buyerName}</Link>
          <p className="text-muted">{order.buyerEmail}</p>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Dirección de envío</h2>
          <address className="space-y-0.5 not-italic text-ink-2">
            <p className="font-medium text-ink">{a.recipientName} · {a.phone}</p>
            <p>{a.street} {a.extNumber}{a.intNumber ? ` int. ${a.intNumber}` : ''}, {a.neighborhood}</p>
            <p>{a.city}, {a.state} {a.postalCode}, {a.country}</p>
            {a.references && <p className="text-muted">Ref.: {a.references}</p>}
          </address>
        </div>
        <div className="card p-5 text-sm">
          <h2 className="mb-3 font-semibold">Totales</h2>
          <dl className="space-y-1.5 tabular-nums">
            {([['Subtotal', order.subtotal], ['Descuentos', -order.discountTotal], ['Envío', order.shippingTotal], ['Total', order.total], ['Comisiones', fees]] as const).map(([k, v]) => (
              <div key={k} className={k === 'Total' ? 'flex justify-between border-t border-line pt-1.5 font-semibold' : 'flex justify-between text-ink-2'}>
                <dt>{k}</dt><dd>{formatMoney(v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <Section title="Pedidos por tienda">
        <div className="space-y-4">
          {order.sellerOrders.map((so) => (
            <div key={so.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{so.store.name}</span>
                  <StatusBadge kind="sellerOrder" value={so.status} />
                  <PublicLink href={`/tienda/${so.store.slug}`}>Ver tienda</PublicLink>
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted tabular-nums">
                  <span>Total <b className="text-ink">{formatMoney(so.total)}</b></span>
                  <span>Comisión <b className="text-ink">{formatMoney(so.commissionAmount)}</b> ({(so.commissionRateBps / 100).toFixed(2)} %)</span>
                  <span>Neto vendedor <b className="text-ink">{formatMoney(so.sellerNet)}</b></span>
                  <span className="flex items-center gap-1">Liquidación <StatusBadge kind="payout" value={so.payoutStatus} /></span>
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {so.items.map((it) => (
                    <tr key={it.id} className="border-t border-line first:border-t-0">
                      <td className={td}>{it.title}<div className="text-xs text-muted">{it.variantName}</div></td>
                      <td className={`${td} text-right tabular-nums text-muted`}>{it.quantity} × {formatMoney(it.unitPrice)}</td>
                      <td className={`${td} text-right tabular-nums`}>{formatMoney(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(so.couponCode || so.shipment) && (
                <p className="border-t border-line px-5 py-2.5 text-xs text-muted">
                  {so.couponCode && <>Cupón {so.couponCode} (−{formatMoney(so.discount)}). </>}
                  {so.shipment && <>Envío: {so.shipment.carrier ?? '—'} · guía {so.shipment.trackingNumber ?? '—'}.</>}
                </p>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section title="Pagos">
        {order.payments.length === 0 ? <p className="text-sm text-muted">Sin intentos de pago.</p> : (
          <div className="space-y-4">
            {order.payments.map((p) => (
              <div key={p.id} className="card p-5">
                <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{PROVIDER_LABELS[p.provider]}</span>
                  <StatusBadge kind="payment" value={p.status} />
                  <span className="tabular-nums text-muted">{formatMoney(p.amount)}{p.amountRefunded ? ` · reembolsado ${formatMoney(p.amountRefunded)}` : ''}</span>
                  {p.providerPaymentId && <span className="font-mono text-xs text-faint">{p.providerPaymentId}</span>}
                </div>
                {p.transactions.length > 0 && (
                  <DataTable head={['Evento', 'Estado', 'Monto', 'Fecha']} className="shadow-none ring-1 ring-line">
                    {p.transactions.map((t) => (
                      <tr key={t.id} className={tr}>
                        <td className={`${td} font-mono text-xs`}>{t.type}</td>
                        <td className={td}>{t.status ? <StatusBadge kind="payment" value={t.status} /> : <span className="text-faint">—</span>}</td>
                        <td className={`${td} tabular-nums`}>{t.amount != null ? formatMoney(t.amount) : '—'}</td>
                        <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(t.createdAt)}</td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
