import { Badge } from '@/components/ui/misc';

type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'dark';

/** Etiquetas y tonos de cada estado, por tipo de entidad. */
export const STATUS = {
  user: { active: ['Activo', 'success'], suspended: ['Suspendido', 'danger'] },
  store: { active: ['Activa', 'success'], suspended: ['Suspendida', 'danger'] },
  product: { draft: ['Borrador', 'neutral'], active: ['Publicado', 'success'], paused: ['Pausado', 'warning'], suspended: ['Suspendido', 'danger'], archived: ['Archivado', 'neutral'] },
  order: { pending_payment: ['Pendiente de pago', 'warning'], paid: ['Pagado', 'info'], completed: ['Completado', 'success'], cancelled: ['Cancelado', 'neutral'], refunded: ['Reembolsado', 'danger'] },
  sellerOrder: { pending_payment: ['Pendiente de pago', 'warning'], paid: ['Pagado', 'info'], processing: ['Preparando', 'info'], shipped: ['Enviado', 'brand'], delivered: ['Entregado', 'success'], cancelled: ['Cancelado', 'neutral'], refunded: ['Reembolsado', 'danger'] },
  payout: { held: ['Retenido', 'warning'], eligible: ['Liberable', 'info'], paid_out: ['Liquidado', 'success'] },
  payment: { created: ['Creado', 'neutral'], pending: ['Pendiente', 'warning'], approved: ['Aprobado', 'success'], rejected: ['Rechazado', 'danger'], cancelled: ['Cancelado', 'neutral'], refunded: ['Reembolsado', 'danger'], partially_refunded: ['Reembolso parcial', 'warning'] },
  review: { published: ['Publicada', 'success'], hidden: ['Oculta', 'neutral'] },
  report: { open: ['Abierto', 'warning'], resolved: ['Resuelto', 'success'], dismissed: ['Descartado', 'neutral'] },
  email: { pending: ['Pendiente', 'warning'], sent: ['Enviado', 'success'], failed: ['Fallido', 'danger'], captured: ['Capturado', 'info'] },
} satisfies Record<string, Record<string, [string, Tone]>>;

export type StatusKind = keyof typeof STATUS;

export function StatusBadge({ kind, value }: { kind: StatusKind; value: string }) {
  const [label, tone] = (STATUS[kind] as Record<string, [string, Tone]>)[value] ?? [value, 'neutral'];
  return <Badge tone={tone}>{label}</Badge>;
}

/** Opciones [valor, etiqueta] para filtros. */
export const statusOptions = (kind: StatusKind) => Object.entries(STATUS[kind]).map(([v, [l]]) => [v, l] as [string, string]);

export const PROVIDER_LABELS: Record<string, string> = { sandbox: 'Sandbox', stripe: 'Stripe', mercadopago: 'Mercado Pago' };
export const TARGET_LABELS: Record<string, string> = { product: 'Producto', store: 'Tienda', review: 'Reseña', user: 'Usuario' };
export const ROLE_LABELS: Record<string, string> = { buyer: 'Comprador', seller: 'Vendedor', admin: 'Admin' };
