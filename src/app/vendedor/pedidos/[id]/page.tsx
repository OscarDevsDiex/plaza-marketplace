import { notFound } from 'next/navigation';
import { Lock, MapPin, Truck } from 'lucide-react';
import { z } from 'zod';
import { requireSeller } from '@/lib/auth/guards';
import { getSellerOrderForStore } from '@/lib/services/orders';
import { bpsToPercent } from '@/lib/services/seller/queries';
import { markDeliveredAction, markProcessingAction, markShippedAction } from '@/actions/seller';
import { BackLink } from '@/components/dashboard-shell';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input, Select } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/misc';
import { Card, OrderStatusBadge, td, th, Thumb } from '@/components/seller/ui';
import { CARRIERS } from '@/components/seller/constants';
import { cn, formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

export const metadata = { title: 'Detalle del pedido' };

const PAID_OR_LATER = ['paid', 'processing', 'shipped', 'delivered'];

export default async function SellerOrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireSeller();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const so = await getSellerOrderForStore(id, store.id);
  if (!so) notFound();
  const { order } = so;
  const addr = PAID_OR_LATER.includes(so.status) ? order.shippingAddress : null; // privacidad: solo con pago confirmado
  const timeline = [
    { at: order.createdAt, text: 'Pedido creado' },
    ...(order.paidAt ? [{ at: order.paidAt, text: 'Pago confirmado' }] : []),
    ...(so.shipment?.events ?? []).map((e) => ({ at: e.occurredAt, text: e.description + (e.location ? ` · ${e.location}` : '') })),
  ];

  return (
    <>
      <BackLink href="/vendedor/pedidos">Pedidos</BackLink>
      <PageHeader title={<span className="flex flex-wrap items-center gap-2">Pedido {orderNumber(order.number)}<OrderStatusBadge status={so.status} /></span>}
        description={`Realizado el ${formatDateTime(order.createdAt)}`} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead><tr><th className={th}>Producto</th><th className={th}>Precio</th><th className={th}>Cant.</th><th className={cn(th, 'text-right')}>Importe</th></tr></thead>
              <tbody>
                {so.items.map((it) => (
                  <tr key={it.id} className="border-t border-line">
                    <td className={td}>
                      <div className="flex items-center gap-3"><Thumb src={it.imageUrl} /><div><p className="font-medium">{it.title}</p><p className="text-xs text-muted">{it.variantName}</p></div></div>
                    </td>
                    <td className={cn(td, 'tabular-nums')}>{formatMoney(it.unitPrice)}</td>
                    <td className={cn(td, 'tabular-nums')}>{it.quantity}</td>
                    <td className={cn(td, 'text-right tabular-nums font-medium')}>{formatMoney(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className="space-y-1.5 border-t border-line px-4 py-4 text-sm [&>div]:flex [&>div]:justify-between">
              <div><dt className="text-muted">Subtotal</dt><dd className="tabular-nums">{formatMoney(so.subtotal)}</dd></div>
              {so.discount > 0 && <div><dt className="text-muted">Descuento{so.couponCode ? ` (${so.couponCode})` : ''}</dt><dd className="tabular-nums text-success">−{formatMoney(so.discount)}</dd></div>}
              <div><dt className="text-muted">Envío</dt><dd className="tabular-nums">{so.shipping ? formatMoney(so.shipping) : 'Gratis'}</dd></div>
              <div className="border-t border-line pt-2 font-semibold"><dt>Total pagado</dt><dd className="tabular-nums">{formatMoney(so.total)}</dd></div>
              <div><dt className="text-muted">Comisión de Plaza ({bpsToPercent(so.commissionRateBps)})</dt><dd className="tabular-nums text-danger">−{formatMoney(so.commissionAmount)}</dd></div>
              <div className="font-semibold"><dt>Tu ingreso neto</dt><dd className="tabular-nums">{formatMoney(so.sellerNet)}</dd></div>
            </dl>
          </div>

          <Card title="Seguimiento">
            <ol className="relative space-y-4 border-l border-line pl-5">
              {timeline.map((e, i) => (
                <li key={i} className="relative">
                  <span className={cn('absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-surface', i === timeline.length - 1 ? 'bg-brand' : 'bg-line-strong')} />
                  <p className="text-sm font-medium">{e.text}</p>
                  <p className="text-xs text-muted">{formatDateTime(e.at)}</p>
                </li>
              ))}
            </ol>
            {so.shipment?.trackingNumber && (
              <p className="mt-4 flex items-center gap-2 rounded-lg bg-subtle px-3 py-2 text-sm"><Truck className="size-4 text-muted" />{so.shipment.carrier} · guía <span className="font-mono">{so.shipment.trackingNumber}</span></p>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Siguiente paso">
            {so.status === 'pending_payment' && <p className="text-sm text-muted">Esperando el pago del comprador. No prepares ni envíes nada hasta que el estado cambie a “Pagado”.</p>}
            {so.status === 'paid' && (
              <ActionForm action={markProcessingAction.bind(null, so.id)} className="mb-5">
                <p className="mb-3 text-sm text-muted">El pago está confirmado. Avisa que ya estás preparando el paquete.</p>
                <SubmitButton variant="secondary" className="w-full">Marcar en preparación</SubmitButton>
              </ActionForm>
            )}
            {(so.status === 'paid' || so.status === 'processing') && (
              <ActionForm action={markShippedAction.bind(null, so.id)} className="space-y-3">
                <Field label="Paquetería" htmlFor="carrier">
                  <Select id="carrier" name="carrier" required defaultValue="">
                    <option value="" disabled>Elige una paquetería</option>
                    {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </Field>
                <Field label="Otra paquetería" htmlFor="carrierOther" hint="Solo si elegiste “Otra”.">
                  <Input id="carrierOther" name="carrierOther" maxLength={60} />
                </Field>
                <Field label="Número de guía" htmlFor="trackingNumber">
                  <Input id="trackingNumber" name="trackingNumber" required minLength={4} maxLength={80} autoComplete="off" />
                </Field>
                <SubmitButton className="w-full" pendingText="Guardando…"><Truck className="size-4" />Marcar como enviado</SubmitButton>
              </ActionForm>
            )}
            {so.status === 'shipped' && (
              <ActionForm action={markDeliveredAction.bind(null, so.id)}>
                <p className="mb-3 text-sm text-muted">El comprador también puede confirmar la entrega. Confírmala tú si la paquetería ya la reporta como entregada.</p>
                <SubmitButton className="w-full">Confirmar entrega</SubmitButton>
              </ActionForm>
            )}
            {so.status === 'delivered' && <p className="text-sm text-success">Pedido entregado. ¡Buen trabajo!</p>}
            {so.status === 'cancelled' && <p className="text-sm text-muted">Este pedido se canceló antes de pagarse. No hay nada que enviar.</p>}
            {so.status === 'refunded' && <p className="text-sm text-muted">Este pedido fue reembolsado al comprador.</p>}
          </Card>

          <Card title="Envío a">
            <p className="text-sm font-medium">{order.buyerName}</p>
            {addr ? (
              <address className="mt-2 flex gap-2 text-sm not-italic text-ink-2">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>
                  {addr.recipientName}<br />
                  {addr.street} {addr.extNumber}{addr.intNumber ? ` int. ${addr.intNumber}` : ''}, {addr.neighborhood}<br />
                  {addr.city}, {addr.state}, C.P. {addr.postalCode}<br />
                  Tel. {addr.phone}
                  {addr.references && <><br /><span className="text-muted">Referencias: {addr.references}</span></>}
                </span>
              </address>
            ) : (
              <p className="mt-2 flex items-start gap-2 text-sm text-muted"><Lock className="mt-0.5 size-4 shrink-0" />La dirección se muestra cuando el pago está confirmado.</p>
            )}
          </Card>

          {PAID_OR_LATER.includes(so.status) && <Card title="Tu pago">
            <p className="text-sm text-muted">
              {so.payoutStatus === 'paid_out' ? 'Liquidado.' : `${formatMoney(so.sellerNet)} retenidos. Se liberarán cuando habilitemos las liquidaciones a vendedores.`}
            </p>
          </Card>}
        </div>
      </div>
    </>
  );
}
