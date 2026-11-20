import { Badge } from '@/components/ui/misc';

type T = Parameters<typeof Badge>[0]['tone'];
export const ORDER_STATUS: Record<string, [string, T]> = {
  pending_payment: ['Pago pendiente', 'warning'], paid: ['Pagado', 'info'], processing: ['En preparación', 'info'],
  shipped: ['Enviado', 'brand'], delivered: ['Entregado', 'success'], completed: ['Completado', 'success'],
  cancelled: ['Cancelado', 'neutral'], refunded: ['Reembolsado', 'neutral'],
};
export const PAYMENT_STATUS: Record<string, [string, T]> = {
  created: ['Creado', 'neutral'], pending: ['Pendiente', 'warning'], approved: ['Aprobado', 'success'], rejected: ['Rechazado', 'danger'],
  cancelled: ['Cancelado', 'neutral'], refunded: ['Reembolsado', 'neutral'], partially_refunded: ['Reembolso parcial', 'warning'],
};

export function StatusBadge({ status, map = ORDER_STATUS }: { status: string; map?: Record<string, [string, T]> }) {
  const [label, tone] = map[status] ?? [status, 'neutral'];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Línea de progreso del sub-pedido: Pagado → En preparación → Enviado → Entregado. */
export function OrderProgress({ status }: { status: string }) {
  const steps = ['paid', 'processing', 'shipped', 'delivered'];
  const idx = steps.indexOf(status);
  if (idx < 0) return null;
  return (
    <ol className="flex items-center gap-2 text-[11px] font-medium text-muted" aria-label="Progreso del pedido">
      {steps.map((s, i) => (
        <li key={s} className="flex flex-1 flex-col gap-1.5">
          <span className={`h-1 rounded-full ${i <= idx ? 'bg-ink' : 'bg-line'}`} />
          <span className={i <= idx ? 'text-ink' : ''}>{ORDER_STATUS[s][0]}</span>
        </li>
      ))}
    </ol>
  );
}
