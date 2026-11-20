import { getProvider } from '@/lib/payments/providers';
import { processProviderEvent } from '@/lib/services/orders';

/**
 * Webhooks de pago (Stripe, Mercado Pago, Sandbox).
 * 1) verifica la firma con el secreto del proveedor, 2) consulta el estado real del pago al proveedor,
 * 3) aplica el cambio de forma idempotente (cada evento se registra una sola vez).
 */
export async function POST(req: Request, ctx: RouteContext<'/api/webhooks/[provider]'>) {
  const { provider: id } = await ctx.params;
  const provider = getProvider(id);
  if (!provider || !provider.isConfigured()) return new Response('Not found', { status: 404 });
  const raw = await req.text();
  if (raw.length > 512_000) return new Response('Payload too large', { status: 413 });
  let event: { eventId: string; ref: string } | null = null;
  try {
    event = await provider.verifyWebhook(req, raw);
  } catch (e) {
    console.error(`webhook ${id}: verificación falló`, e);
  }
  if (!event) return new Response('Invalid signature', { status: 401 });
  try {
    const result = await processProviderEvent(provider.id, event.eventId, event.ref);
    return Response.json({ received: true, result: result.reason });
  } catch (e) {
    console.error(`webhook ${id}: error al procesar`, e);
    return new Response('Error', { status: 500 }); // el proveedor reintentará
  }
}
