import { describe, expect, it } from 'vitest';
import { storeTotals, commission, couponProblem, unitPrice, type CouponRule } from '../src/lib/services/pricing';
import { parseMoney, formatMoney, discountPercent } from '../src/lib/utils';

const line = (unitPrice: number, quantity = 1, categoryId = 1) => ({ variantId: 'v', unitPrice, quantity, categoryId });
const coupon = (c: Partial<CouponRule>): CouponRule => ({ id: 'c', code: 'X', type: 'percent', value: 10, minSubtotal: 0, maxUses: null, uses: 0, startsAt: null, endsAt: null, active: true, ...c });
const ship = { shippingFlat: 9900, freeShippingOver: 79900 };

describe('precio unitario', () => {
  it('usa variante > oferta > precio', () => {
    expect(unitPrice(1000, 800, null)).toBe(800);
    expect(unitPrice(1000, null, null)).toBe(1000);
    expect(unitPrice(1000, 800, 1200)).toBe(1200);
  });
});

describe('totales por tienda', () => {
  it('cobra envío debajo del mínimo y lo regala arriba', () => {
    expect(storeTotals([line(50000)], ship)).toMatchObject({ subtotal: 50000, shipping: 9900, total: 59900 });
    expect(storeTotals([line(40000, 2)], ship)).toMatchObject({ subtotal: 80000, shipping: 0, total: 80000 });
  });
  it('el envío gratis se evalúa después del descuento', () => {
    const t = storeTotals([line(80000)], ship, coupon({ value: 10 }));
    expect(t.discount).toBe(8000);
    expect(t.shipping).toBe(9900); // 72,000 < 79,900
  });
  it('un cupón fijo nunca deja el subtotal negativo', () => {
    expect(storeTotals([line(5000)], { shippingFlat: 0, freeShippingOver: null }, coupon({ type: 'fixed', value: 99999 })).total).toBe(0);
  });
  it('sin artículos no cobra envío', () => {
    expect(storeTotals([], ship).total).toBe(0);
  });
  it('un cupón inválido no descuenta y explica por qué', () => {
    const t = storeTotals([line(10000)], ship, coupon({ minSubtotal: 50000 }));
    expect(t.discount).toBe(0);
    expect(t.couponProblem).toMatch(/compra mínima/);
  });
});

describe('reglas de cupones', () => {
  const now = new Date('2026-06-15T12:00:00Z');
  it('vigencia, usos y estado', () => {
    expect(couponProblem(coupon({ active: false }), 1, now)).toBeTruthy();
    expect(couponProblem(coupon({ startsAt: new Date('2026-07-01') }), 1, now)).toMatch(/aún no/);
    expect(couponProblem(coupon({ endsAt: new Date('2026-06-01') }), 1, now)).toMatch(/venció/);
    expect(couponProblem(coupon({ maxUses: 5, uses: 5 }), 1, now)).toMatch(/agotó/);
    expect(couponProblem(coupon({}), 1, now)).toBeNull();
  });
});

describe('comisiones', () => {
  it('aplica la tasa de cada categoría sobre el monto con descuento, sin envío', () => {
    const rate = (cat: number) => (cat === 2 ? 800 : 1000);
    const c = commission([line(10000, 1, 1), line(10000, 1, 2)], 0, rate);
    expect(c.amount).toBe(1800); // 10% de 100 + 8% de 100
    expect(c.rateBps).toBe(900);
    expect(commission([line(10000)], 5000, rate).amount).toBe(500); // descuento del 50 %
  });
});

describe('dinero', () => {
  it('convierte entradas de usuario a centavos sin errores de redondeo', () => {
    expect(parseMoney('1,299.50')).toBe(129950);
    expect(parseMoney('$0.1')).toBe(10);
    expect(parseMoney('19.99')).toBe(1999);
    expect(Number.isNaN(parseMoney('12.345'))).toBe(true);
    expect(Number.isNaN(parseMoney('-5'))).toBe(true);
  });
  it('formatea y calcula descuentos', () => {
    expect(formatMoney(129900)).toBe('$1,299');
    expect(formatMoney(129950)).toBe('$1,299.50');
    expect(discountPercent(10000, 7500)).toBe(25);
    expect(discountPercent(10000, null)).toBe(0);
  });
});
