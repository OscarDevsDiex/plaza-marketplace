/** Funciones puras del panel (sin base de datos), probadas en format.test.ts. */

/** Patrón para LIKE/ILIKE con \, % y _ escapados (el escape por defecto de Postgres es la barra invertida). */
export const likeTerm = (q: string, prefixOnly = false) => {
  const s = q.replace(/[\\%_]/g, (c) => `\\${c}`);
  return prefixOnly ? `${s}%` : `%${s}%`;
};

/** "12.5" / "12,50" / "12.5%" → 1250 puntos base. null si no es un porcentaje válido entre 0 y 50 con hasta 2 decimales. */
export function percentToBps(input: string) {
  const s = input.trim().replace(',', '.').replace(/\s*%$/, '');
  if (!/^\d{1,2}(\.\d{1,2})?$/.test(s)) return null;
  const bps = Math.round(Number(s) * 100);
  return bps <= 5000 ? bps : null;
}
