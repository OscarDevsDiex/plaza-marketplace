import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PROVIDERS } from '@/lib/payments/providers';
import { sandboxDecisionAction } from '@/actions/shop';
import { SubmitButton } from '@/components/ui/action-form';
import { formatMoney, orderNumber } from '@/lib/utils';

export const metadata: Metadata = { title: 'Pago de prueba (Sandbox)', robots: { index: false } };

/**
 * Pasarela de PRUEBA. Existe solo para probar el flujo completo sin credenciales reales:
 * no pide datos de tarjeta y no mueve dinero. Está deshabilitada en producción salvo ENABLE_SANDBOX_PAYMENTS=true.
 */
export default async function SandboxPaymentPage(props: PageProps<'/pagos/sandbox/[paymentId]'>) {
  const user = await requireUser();
  const { paymentId } = await props.params;
  if (!PROVIDERS.sandbox.isConfigured() || !/^[0-9a-f-]{36}$/.test(paymentId)) notFound();
  const [row] = await db.select({ pay: schema.payments, order: schema.orders }).from(schema.payments)
    .innerJoin(schema.orders, eq(schema.orders.id, schema.payments.orderId)).where(eq(schema.payments.id, paymentId));
  if (!row || row.order.buyerId !== user.id || row.pay.provider !== 'sandbox') notFound();
  const done = row.pay.status !== 'pending' && row.pay.status !== 'created';

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border-2 border-dashed border-warning bg-warning-soft p-4 text-sm text-warning">
        <div className="flex items-center gap-2 font-semibold"><FlaskConical className="size-4" />MODO SANDBOX · ENTORNO DE PRUEBAS</div>
        <p className="mt-1">Esta pantalla simula a un proveedor de pagos. No se realiza ningún cargo real ni se piden datos de tarjeta.</p>
      </div>
      <div className="card mt-6 p-6">
        <div className="text-sm text-muted">Pedido {orderNumber(row.order.number)}</div>
        <div className="mt-1 text-3xl font-semibold tabular-nums">{formatMoney(row.pay.amount)}</div>
        <div className="mt-1 text-xs text-muted">Referencia de pago: {row.pay.providerPaymentId}</div>
        {done ? (
          <p className="mt-6 rounded-lg bg-subtle px-3 py-2 text-sm">Este pago ya fue procesado (estado: {row.pay.status}).</p>
        ) : row.order.status !== 'pending_payment' ? (
          <p className="mt-6 rounded-lg bg-subtle px-3 py-2 text-sm">Este pedido ya no admite pagos.</p>
        ) : (
          <form action={sandboxDecisionAction.bind(null, paymentId)} className="mt-6 grid gap-3">
            <SubmitButton variant="primary" size="lg" className="w-full" pendingText="Procesando…"><CheckCircle2 className="size-4" />Simular pago aprobado</SubmitButton>
            <input type="hidden" name="decision" value="approve" />
          </form>
        )}
        {!done && row.order.status === 'pending_payment' && (
          <form action={sandboxDecisionAction.bind(null, paymentId)} className="mt-3">
            <input type="hidden" name="decision" value="reject" />
            <SubmitButton variant="danger" size="lg" className="w-full" pendingText="Procesando…"><XCircle className="size-4" />Simular pago rechazado</SubmitButton>
          </form>
        )}
      </div>
    </main>
  );
}
