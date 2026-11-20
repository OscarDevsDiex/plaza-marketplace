import { CURRENCY, LOCALE } from './config';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

const moneyFmt = new Map<number, Intl.NumberFormat>();
/** Centavos → "$1,299" (sin decimales si son cero). */
export function formatMoney(cents: number) {
  const d = cents % 100 ? 2 : 0;
  let f = moneyFmt.get(d);
  if (!f) moneyFmt.set(d, (f = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: CURRENCY, minimumFractionDigits: d, maximumFractionDigits: d })));
  return f.format(cents / 100);
}

/** "1,299.50" o "1299.5" → 129950. Devuelve NaN si no es un monto válido. */
export function parseMoney(input: unknown): number {
  const s = String(input ?? '').replace(/[$,\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return NaN;
  return Math.round(Number(s) * 100);
}

export function centsToInput(cents: number | null | undefined) {
  return cents == null ? '' : (cents / 100).toFixed(cents % 100 ? 2 : 0);
}

export function discountPercent(price: number, sale: number | null | undefined) {
  return sale && sale < price ? Math.round((1 - sale / price) * 100) : 0;
}

export function slugify(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
}

const dateFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
const dateTimeFmt = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const formatDate = (d: Date | string) => dateFmt.format(new Date(d));
export const formatDateTime = (d: Date | string) => dateTimeFmt.format(new Date(d));

export const orderNumber = (n: number) => `PZ-${n}`;

export function pluralize(n: number, one: string, many: string) {
  return `${n.toLocaleString(LOCALE)} ${n === 1 ? one : many}`;
}
