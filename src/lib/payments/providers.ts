import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { IS_PROD } from '@/lib/config';
import type { PaymentProvider, PaymentState, ProviderId } from './types';

const safeEq = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
const hmac = (secret: string, data: string) => createHmac('sha256', secret).update(data).digest('hex');

/**
 * SANDBOX — entorno de pruebas interno y claramente identificado. No mueve dinero.
 * Se habilita automáticamente en desarrollo; en producción solo con ENABLE_SANDBOX_PAYMENTS=true.
 * El "proveedor" es una página propia (/pagos/sandbox/[id]) que emite eventos firmados con SANDBOX_SECRET.
 */
const sandbox: PaymentProvider = {
  id: 'sandbox',
  label: 'Pago de prueba (Sandbox)',
  description: 'Entorno de pruebas: no se realiza ningún cargo real.',
  isConfigured: () => !IS_PROD || process.env.ENABLE_SANDBOX_PAYMENTS === 'true',
  async createCheckout(i) {
    return { checkoutUrl: `/pagos/sandbox/${i.paymentId}`, providerPaymentId: `sbx_${i.paymentId}` };
  },
  async verifyWebhook(req, raw) {
    const sig = req.headers.get('x-sandbox-signature') ?? '';
    if (!safeEq(sig, hmac(sandboxSecret(), raw))) return null;
    const body = JSON.parse(raw) as { eventId: string; ref: string };
    return { eventId: body.eventId, ref: body.ref };
  },
  async fetchPayment(ref) {
    // En sandbox el "estado del proveedor" se guarda en la última transacción firmada de ese pago.
    const [pay] = await db.select().from(schema.payments).where(eq(schema.payments.providerPaymentId, ref)).limit(1);
    if (!pay) return null;
    const txs = await db.select().from(schema.paymentTransactions).where(eq(schema.paymentTransactions.paymentId, pay.id));
    const last = txs.filter((t) => t.type === 'sandbox_event').at(-1);
    const state = ((last?.data as { state?: PaymentState } | null)?.state ?? 'pending') as PaymentState;
    return { paymentId: pay.id, providerPaymentId: ref, state, amount: pay.amount, currency: pay.currency, amountRefunded: state === 'refunded' ? pay.amount : 0 };
  },
  async refund(ref) {
    return { refundId: `sbx_refund_${ref}_${Date.now()}` };
  },
};
export const sandboxSecret = () => process.env.SANDBOX_SECRET ?? (IS_PROD ? '' : 'dev-sandbox-secret');
export const signSandbox = (raw: string) => hmac(sandboxSecret(), raw);

/** STRIPE — Checkout Sessions vía API REST (sin SDK). Requiere STRIPE_SECRET_KEY y STRIPE_WEBHOOK_SECRET. */
const stripeFetch = async (path: string, body?: URLSearchParams) => {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, ...(body && { 'Content-Type': 'application/x-www-form-urlencoded' }) },
    body, signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${data?.error?.message ?? 'error'}`);
  return data;
};
const stripe: PaymentProvider = {
  id: 'stripe',
  label: 'Tarjeta de crédito o débito (Stripe)',
  description: 'Pago seguro con tarjeta procesado por Stripe.',
  isConfigured: () => !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_WEBHOOK_SECRET,
  async createCheckout(i) {
    const b = new URLSearchParams({
      mode: 'payment',
      success_url: i.returnUrl, cancel_url: i.cancelUrl,
      client_reference_id: i.paymentId, customer_email: i.buyerEmail,
      'metadata[payment_id]': i.paymentId, 'payment_intent_data[metadata][payment_id]': i.paymentId,
      'line_items[0][quantity]': '1',
      'line_items[0][price_data][currency]': i.currency.toLowerCase(),
      'line_items[0][price_data][unit_amount]': String(i.amount),
      'line_items[0][price_data][product_data][name]': `Pedido PZ-${i.orderNumber}`,
    });
    const s = await stripeFetch('/checkout/sessions', b);
    return { checkoutUrl: s.url, providerPaymentId: s.id };
  },
  async verifyWebhook(req, raw) {
    const header = req.headers.get('stripe-signature') ?? '';
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=') as [string, string]));
    const t = Number(parts.t);
    if (!t || Math.abs(Date.now() / 1000 - t) > 300) return null; // tolerancia de 5 min contra reenvíos
    const expected = hmac(process.env.STRIPE_WEBHOOK_SECRET!, `${t}.${raw}`);
    const ok = header.split(',').some((kv) => kv.startsWith('v1=') && safeEq(kv.slice(3), expected));
    if (!ok) return null;
    const evt = JSON.parse(raw);
    const obj = evt.data?.object ?? {};
    const ref = obj.object === 'checkout.session' ? obj.id : obj.metadata?.checkout_session ?? null;
    if (obj.object === 'charge' && obj.payment_intent) {
      const sessions = await stripeFetch(`/checkout/sessions?payment_intent=${obj.payment_intent}&limit=1`);
      return sessions.data?.[0] ? { eventId: evt.id, ref: sessions.data[0].id } : null;
    }
    return ref ? { eventId: evt.id, ref } : null;
  },
  async fetchPayment(ref) {
    const s = await stripeFetch(`/checkout/sessions/${encodeURIComponent(ref)}?expand[]=payment_intent.latest_charge`);
    const charge = s.payment_intent?.latest_charge;
    const refunded = charge?.amount_refunded ?? 0;
    const state: PaymentState = refunded && refunded >= s.amount_total ? 'refunded' : refunded ? 'partially_refunded'
      : s.payment_status === 'paid' ? 'approved' : s.status === 'expired' ? 'cancelled' : 'pending';
    return { paymentId: s.client_reference_id, providerPaymentId: s.id, state, amount: s.amount_total, currency: String(s.currency).toUpperCase(), amountRefunded: refunded };
  },
  async refund(ref, amount) {
    const s = await stripeFetch(`/checkout/sessions/${encodeURIComponent(ref)}`);
    const r = await stripeFetch('/refunds', new URLSearchParams({ payment_intent: s.payment_intent, amount: String(amount) }));
    return { refundId: r.id };
  },
};

/** MERCADO PAGO — Checkout Pro vía API REST. Requiere MP_ACCESS_TOKEN y MP_WEBHOOK_SECRET. */
const mpFetch = async (path: string, body?: unknown, idempotencyKey?: string) => {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`, 'Content-Type': 'application/json', ...(idempotencyKey && { 'X-Idempotency-Key': idempotencyKey }) },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Mercado Pago ${res.status}: ${data?.message ?? 'error'}`);
  return data;
};
const MP_STATE: Record<string, PaymentState> = {
  approved: 'approved', authorized: 'pending', pending: 'pending', in_process: 'pending', in_mediation: 'pending',
  rejected: 'rejected', cancelled: 'cancelled', refunded: 'refunded', charged_back: 'refunded',
};
const mercadopago: PaymentProvider = {
  id: 'mercadopago',
  label: 'Mercado Pago (tarjeta, OXXO, saldo)',
  description: 'Paga con tarjeta, efectivo en OXXO o tu saldo de Mercado Pago.',
  isConfigured: () => !!process.env.MP_ACCESS_TOKEN && !!process.env.MP_WEBHOOK_SECRET,
  async createCheckout(i) {
    const https = i.webhookUrl.startsWith('https://');
    const pref = await mpFetch('/checkout/preferences', {
      items: [{ id: String(i.orderNumber), title: `Pedido PZ-${i.orderNumber}`, quantity: 1, unit_price: i.amount / 100, currency_id: i.currency }],
      payer: { email: i.buyerEmail },
      external_reference: i.paymentId,
      back_urls: { success: i.returnUrl, pending: i.returnUrl, failure: i.cancelUrl },
      ...(https && { auto_return: 'approved', notification_url: i.webhookUrl }),
    }, i.paymentId);
    return { checkoutUrl: pref.init_point };
  },
  async verifyWebhook(req, raw) {
    // Firma oficial: HMAC-SHA256 de "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
    const url = new URL(req.url);
    const body = raw ? JSON.parse(raw) : {};
    const dataId = String(url.searchParams.get('data.id') ?? body?.data?.id ?? '').toLowerCase();
    const [ts, v1] = ['ts', 'v1'].map((k) => (req.headers.get('x-signature') ?? '').split(',').map((p) => p.trim().split('=')).find(([key]) => key === k)?.[1] ?? '');
    const manifest = `id:${dataId};request-id:${req.headers.get('x-request-id') ?? ''};ts:${ts};`;
    if (!dataId || !v1 || !safeEq(v1, hmac(process.env.MP_WEBHOOK_SECRET!, manifest))) return null;
    if ((body.type ?? url.searchParams.get('type')) !== 'payment') return null;
    return { eventId: `${body.id ?? dataId}:${body.action ?? ''}:${ts}`, ref: dataId };
  },
  async fetchPayment(ref) {
    if (!/^\d+$/.test(ref)) return null;
    const pay = await mpFetch(`/v1/payments/${ref}`);
    const refunded = Math.round((pay.transaction_amount_refunded ?? 0) * 100);
    const amount = Math.round(pay.transaction_amount * 100);
    const state = refunded && refunded < amount ? 'partially_refunded' : (MP_STATE[pay.status] ?? 'pending');
    return { paymentId: pay.external_reference, providerPaymentId: String(pay.id), state, amount, currency: pay.currency_id, amountRefunded: refunded };
  },
  async refund(ref, amount) {
    const r = await mpFetch(`/v1/payments/${ref}/refunds`, { amount: amount / 100 }, `refund-${ref}-${amount}`);
    return { refundId: String(r.id) };
  },
};

export const PROVIDERS: Record<ProviderId, PaymentProvider> = { sandbox, stripe, mercadopago };
export const availableProviders = () => Object.values(PROVIDERS).filter((p) => p.isConfigured());
export const getProvider = (id: string) => (Object.hasOwn(PROVIDERS, id) ? PROVIDERS[id as ProviderId] : null);
