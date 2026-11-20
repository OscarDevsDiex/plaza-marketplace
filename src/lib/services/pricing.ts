/**
 * Cálculo de totales. Funciones puras (sin base de datos) para poder probarlas a fondo:
 * el carrito, el checkout y las pruebas usan exactamente la misma lógica.
 */
export type PricedLine = { variantId: string; unitPrice: number; quantity: number; categoryId: number };
export type StoreShipping = { shippingFlat: number; freeShippingOver: number | null };
export type CouponRule = { id: string; code: string; type: 'percent' | 'fixed'; value: number; minSubtotal: number; maxUses: number | null; uses: number; startsAt: Date | null; endsAt: Date | null; active: boolean };

export function unitPrice(price: number, salePrice: number | null, priceOverride: number | null) {
  return priceOverride ?? salePrice ?? price;
}

export function couponProblem(c: CouponRule | undefined, subtotal: number, now = new Date()): string | null {
  if (!c || !c.active) return 'Cupón no válido para esta tienda';
  if (c.startsAt && now < c.startsAt) return 'Este cupón aún no está vigente';
  if (c.endsAt && now > c.endsAt) return 'Este cupón ya venció';
  if (c.maxUses != null && c.uses >= c.maxUses) return 'Este cupón ya se agotó';
  if (subtotal < c.minSubtotal) return 'No alcanzas la compra mínima del cupón';
  return null;
}

export function storeTotals(lines: PricedLine[], ship: StoreShipping, coupon?: CouponRule | null, now = new Date()) {
  const subtotal = lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);
  const problem = coupon ? couponProblem(coupon, subtotal, now) : null;
  const discount = coupon && !problem
    ? coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal)
    : 0;
  const net = subtotal - discount;
  const shipping = lines.length === 0 || (ship.freeShippingOver != null && net >= ship.freeShippingOver) ? 0 : ship.shippingFlat;
  return { subtotal, discount, shipping, total: net + shipping, couponProblem: problem };
}

/**
 * Comisión de la plataforma: cada línea usa la tasa de su categoría (o la global), sobre el monto
 * después del descuento (prorrateado). El envío no paga comisión.
 */
export function commission(lines: PricedLine[], discount: number, rateFor: (categoryId: number) => number) {
  const subtotal = lines.reduce((t, l) => t + l.unitPrice * l.quantity, 0);
  if (!subtotal) return { amount: 0, rateBps: 0 };
  const factor = (subtotal - discount) / subtotal;
  const amount = Math.round(lines.reduce((t, l) => t + l.unitPrice * l.quantity * factor * rateFor(l.categoryId) / 10_000, 0));
  return { amount, rateBps: Math.round((amount / (subtotal - discount || 1)) * 10_000) };
}
