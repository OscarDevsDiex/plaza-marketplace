import { timingSafeEqual } from 'node:crypto';
import { expireStaleOrders } from '@/lib/services/orders';

/**
 * Libera el inventario de pedidos que no se pagaron a tiempo. Programar cada 10-15 min
 * (Vercel Cron, GitHub Actions o cualquier cron) con la cabecera Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const got = req.headers.get('authorization') ?? '';
  const expected = `Bearer ${secret}`;
  if (!secret || got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return new Response('Unauthorized', { status: 401 });
  }
  return Response.json({ expired: await expireStaleOrders() });
}
