import { describe, expect, it } from 'vitest';
import { likeTerm, percentToBps } from './format';

describe('likeTerm', () => {
  it('escapa comodines', () => {
    expect(likeTerm('50%_off\\')).toBe('%50\\%\\_off\\\\%');
    expect(likeTerm('payment.', true)).toBe('payment.%');
  });
});

describe('percentToBps', () => {
  it('convierte porcentajes a puntos base', () => {
    expect(percentToBps('12.5')).toBe(1250);
    expect(percentToBps('12,50 %')).toBe(1250);
    expect(percentToBps('0')).toBe(0);
    expect(percentToBps('50')).toBe(5000);
    expect(percentToBps('0.07')).toBe(7);
  });
  it('rechaza valores fuera de rango o mal formados', () => {
    for (const bad of ['50.01', '51', '-1', '1.234', 'abc', '', '100']) expect(percentToBps(bad)).toBeNull();
  });
});
