import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Clock, XCircle, Truck, MapPin, Star, FlaskConical } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { getBuyerOrder } from '@/lib/services/account';
import { processProviderEvent } from '@/lib/services/orders';
import { availableProviders } from '@/lib/payments/providers';
import { cancelOrderAction, confirmDeliveryAction, retryPaymentAction } from '@/actions/shop';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { ButtonLink } from '@/components/ui/button';
import { Select } from '@/components/ui/form';
import { Badge } from '@/components/ui/misc';
import { BackLink } from '@/components/dashboard-shell';
import { OrderProgress, PAYMENT_STATUS, StatusBadge } from '@/components/order-status';
import { formatDate, formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Detalle del pedido' };

export default async function OrderDetail(props: PageProps<'/cuenta/pedidos/[id]'>) {
  const user = await requireUser('/cuenta/pedidos');
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  let order = await getBuyerOrder(user.id, id);
  if (!order) notFound();

  // Regreso desde Stripe / Mercado Pago: confirmamos el estado consultando al proveedor (el webhook puede tardar).
  const pay = order.payment;
  if (sp.pago === 'retorno' && pay && pay.status === 'pending') {
    const ref = pay.provider === 'mercadopago' ? (typeof sp.payment_id === 'string' ? sp.payment_id : null) : pay.providerPaymentId;
    if (ref && pay.provider !== 'sandbox') {
      await processProviderEvent(pay.provider, `return:${pay.id}:${ref}`, ref).catch((e) => console.error('verificación al regresar del pago', e));
      order = (await getBuyerOrder(user.id, id))!;
    }
  }

  const a = order.shippingAddress;
  const banner = sp.pago === 'aprobado' || (sp.pago === 'retorno' && order.status === 'paid')
    ? ['ok', '¡Pago confirmado! Las tiendas ya fueron notificadas para preparar tu pedido.']
    : sp.pago === 'rechazado' ? ['error', 'El pago no se completó. Puedes intentarlo de nuevo.']
    : sp.pago === 'cancelado' ? ['error', 'Cancelaste el pago. Tu pedido sigue apartado unos minutos: puedes intentarlo de nuevo.'] : null;

  return (
    <>
      <BackLink href="/cuenta/pedidos">Mis compras</BackLink>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-3 text-2xl font-semibold">{orderNumber(order.number)} <StatusBadge status={order.status} /></h1>
          <p className="mt-1 text-sm text-muted">Realizado el {formatDateTime(order.createdAt)}</p>
        </div>
      </div>

      {banner && <div className={`mt-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${banner[0] === 'ok' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>{banner[0] === 'ok' ? <CheckCircle2 className="size-4" /> : <XCircle className="size-4" />}{banner[1]}</div>}

      {order.status === 'pending_payment' && (
        <div className="card mt-5 flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="flex items-start gap-3">
            <Clock className="mt-0.5 size-5 text-warning" />
            <div><div className="font-medium">Pendiente de pago</div><p className="text-sm text-muted">Apartamos tus productos hasta el {order.expiresAt ? formatDateTime(order.expiresAt) : 'vencimiento'}.</p></div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <form action={retryPaymentAction.bind(null, order.id)} className="flex gap-2">
              <Select name="provider" className="h-10 w-56" defaultValue={pay?.provider ?? undefined} aria-label="Método de pago">
                {availableProviders().map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </Select>
              <SubmitButton>Pagar ahora</SubmitButton>
            </form>
            <ActionForm action={cancelOrderAction.bind(null, order.id)}><SubmitButton variant="danger">Cancelar pedido</SubmitButton></ActionForm>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {order.sellerOrders.map((so) => (
            <section key={so.id} className="card overflow-hidden">
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div className="text-sm">Vendido por <Link href={`/tienda/${so.store.slug}`} className="font-medium hover:underline">{so.store.name}</Link></div>
                <StatusBadge status={so.status} />
              </header>
              <div className="space-y-5 p-5">
                <OrderProgress status={so.status} />
                <ul className="space-y-4">
                  {so.items.map((i) => (
                    <li key={i.id} className="flex gap-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={i.imageUrl ?? ''} alt="" className="size-16 shrink-0 rounded-lg bg-subtle object-cover" />
                      <div className="min-w-0 flex-1 text-sm">
                        <div className="font-medium">{i.title}</div>
                        <div className="text-xs text-muted">{i.variantName !== 'Único' && `${i.variantName} · `}{i.quantity} × {formatMoney(i.unitPrice)}</div>
                        {so.status === 'delivered' && i.productId && (i.reviewed
                          ? <span className="mt-2 inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 className="size-3.5" />Ya calificaste este producto</span>
                          : <ButtonLink href={`/cuenta/resenas/${i.id}`} variant="secondary" size="sm" className="mt-2"><Star className="size-3.5" />Calificar producto</ButtonLink>)}
                      </div>
                      <div className="text-sm font-medium tabular-nums">{formatMoney(i.lineTotal)}</div>
                    </li>
                  ))}
                </ul>
                {so.shipment && (
                  <div className="rounded-xl bg-subtle p-4 text-sm">
                    <div className="flex flex-wrap items-center gap-2 font-medium"><Truck className="size-4" />{so.shipment.carrier} · Guía {so.shipment.trackingNumber}</div>
                    <ol className="mt-3 space-y-2 border-l border-line-strong pl-4">
                      {so.shipment.events.map((e) => <li key={e.id} className="relative text-xs"><span className="absolute top-1 -left-[21px] size-2 rounded-full bg-ink" /><span className="text-ink-2">{e.description}</span><span className="block text-muted">{formatDateTime(e.occurredAt)}</span></li>)}
                    </ol>
                  </div>
                )}
                {so.status === 'shipped' && (
                  <ActionForm action={confirmDeliveryAction.bind(null, so.id)} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-4 text-sm">
                    <span>¿Ya recibiste este paquete?</span>
                    <SubmitButton size="sm">Confirmar que lo recibí</SubmitButton>
                  </ActionForm>
                )}
                <dl className="grid grid-cols-2 gap-1 border-t border-line pt-4 text-sm sm:max-w-xs sm:justify-self-end">
                  <dt className="text-muted">Productos</dt><dd className="text-right tabular-nums">{formatMoney(so.subtotal)}</dd>
                  {so.discount > 0 && <><dt className="text-success">Cupón {so.couponCode}</dt><dd className="text-right text-success tabular-nums">−{formatMoney(so.discount)}</dd></>}
                  <dt className="text-muted">Envío</dt><dd className="text-right tabular-nums">{so.shipping ? formatMoney(so.shipping) : 'Gratis'}</dd>
                </dl>
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-5">
          <div className="card p-5 text-sm">
            <h2 className="font-semibold">Resumen</h2>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between"><dt className="text-muted">Productos</dt><dd className="tabular-nums">{formatMoney(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && <div className="flex justify-between text-success"><dt>Descuentos</dt><dd className="tabular-nums">−{formatMoney(order.discountTotal)}</dd></div>}
              <div className="flex justify-between"><dt className="text-muted">Envío</dt><dd className="tabular-nums">{order.shippingTotal ? formatMoney(order.shippingTotal) : 'Gratis'}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(order.total)}</dd></div>
            </dl>
            {pay && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4 text-xs text-muted">
                Pago: <StatusBadge status={pay.status} map={PAYMENT_STATUS} />
                {pay.provider === 'sandbox' && <Badge tone="warning"><FlaskConical className="size-3" />Sandbox</Badge>}
                {order.paidAt && <span>· {formatDate(order.paidAt)}</span>}
              </div>
            )}
          </div>
          <div className="card p-5 text-sm">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="size-4" />Entrega</h2>
            <p className="mt-2 leading-relaxed text-ink-2">
              {a.recipientName}<br />{a.street} {a.extNumber}{a.intNumber ? ` int. ${a.intNumber}` : ''}<br />{a.neighborhood}, {a.city}<br />{a.state}, C.P. {a.postalCode}<br /><span className="text-muted">Tel. {a.phone}</span>
            </p>
          </div>
          <p className="px-1 text-xs text-muted">¿Algún problema con tu pedido? Escríbenos desde <Link href="/ayuda/compra-protegida" className="link">Compra protegida</Link>.</p>
        </aside>
      </div>
    </>
  );
}
