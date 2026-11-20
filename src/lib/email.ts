import 'server-only';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { APP_NAME, APP_URL } from '@/lib/config';

/**
 * Todo correo pasa por la tabla email_outbox (registro y reintentos).
 * Con RESEND_API_KEY se envía de verdad; sin ella queda "capturado" y se puede ver en /dev/correos (solo desarrollo).
 */
export async function sendEmail(to: string, subject: string, html: string) {
  const [row] = await db.insert(schema.emailOutbox).values({ to, subject, html }).returning({ id: schema.emailOutbox.id });
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) {
    await db.update(schema.emailOutbox).set({ status: 'captured' }).where(eq(schema.emailOutbox.id, row.id));
    return;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
    await db.update(schema.emailOutbox)
      .set(res.ok ? { status: 'sent', providerId: data.id ?? null, sentAt: new Date() } : { status: 'failed', error: data.message ?? String(res.status) })
      .where(eq(schema.emailOutbox.id, row.id));
  } catch (e) {
    await db.update(schema.emailOutbox).set({ status: 'failed', error: String(e) }).where(eq(schema.emailOutbox.id, row.id));
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Plantilla base: HTML sencillo con estilos en línea (lo que mejor soportan los clientes de correo). */
export function emailLayout(opts: { title: string; intro: string; cta?: { label: string; href: string }; footer?: string }) {
  const href = opts.cta && (opts.cta.href.startsWith('http') ? opts.cta.href : APP_URL + opts.cta.href);
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px">
    <div style="font-weight:700;font-size:20px;margin-bottom:24px">${escapeHtml(APP_NAME)}</div>
    <div style="background:#fff;border:1px solid #e4e4e7;border-radius:14px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(opts.title)}</h1>
      <p style="font-size:15px;line-height:1.6;color:#3f3f46;margin:0 0 20px">${escapeHtml(opts.intro)}</p>
      ${href ? `<a href="${escapeHtml(href)}" style="display:inline-block;background:#18181b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600;font-size:14px">${escapeHtml(opts.cta!.label)}</a>` : ''}
    </div>
    <p style="font-size:12px;color:#71717a;margin-top:20px">${escapeHtml(opts.footer ?? `Recibiste este correo porque tienes una cuenta en ${APP_NAME}.`)}</p>
  </div></body></html>`;
}
