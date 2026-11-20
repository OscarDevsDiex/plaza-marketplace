import { formatMoney } from '@/lib/utils';

/**
 * Gráfica de área ligera en SVG (sin librerías, se renderiza en el servidor).
 * `points`: [{ label, value }] en orden cronológico. `money` formatea los valores como dinero (centavos).
 */
export function AreaChart({ points, money = false, height = 220 }: { points: { label: string; value: number }[]; money?: boolean; height?: number }) {
  const W = 640, H = height, P = { t: 16, r: 12, b: 28, l: 12 };
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? (W - P.l - P.r) / (points.length - 1) : 0;
  const x = (i: number) => P.l + i * step;
  const y = (v: number) => P.t + (H - P.t - P.b) * (1 - v / max);
  const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = points.length ? `${line} L${x(points.length - 1)},${H - P.b} L${x(0)},${H - P.b} Z` : '';
  const fmt = (v: number) => (money ? formatMoney(v) : v.toLocaleString('es-MX'));
  const labelEvery = Math.ceil(points.length / 7);
  const total = points.reduce((t, p) => t + p.value, 0);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Gráfica: total ${fmt(total)}`}>
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => <line key={f} x1={P.l} x2={W - P.r} y1={y(max * f)} y2={y(max * f)} stroke="var(--color-line)" strokeDasharray="3 4" />)}
        <line x1={P.l} x2={W - P.r} y1={H - P.b} y2={H - P.b} stroke="var(--color-line-strong)" />
        {area && <path d={area} fill="url(#area-fill)" />}
        {line && <path d={line} fill="none" stroke="var(--color-brand)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.value)} r={3} fill="white" stroke="var(--color-brand)" strokeWidth={1.5}><title>{`${p.label}: ${fmt(p.value)}`}</title></circle>
            {i % labelEvery === 0 && <text x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="var(--color-muted)">{p.label}</text>}
          </g>
        ))}
      </svg>
      <figcaption className="sr-only">{points.map((p) => `${p.label}: ${fmt(p.value)}`).join(', ')}</figcaption>
    </figure>
  );
}

/** Barras horizontales para rankings (productos más vendidos, categorías…). */
export function BarList({ items, money = false }: { items: { label: string; value: number; href?: string }[]; money?: boolean }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it.label} className="text-sm">
          <div className="mb-1 flex justify-between gap-3"><span className="truncate text-ink-2">{it.label}</span><span className="tabular-nums font-medium">{money ? formatMoney(it.value) : it.value.toLocaleString('es-MX')}</span></div>
          <div className="h-1.5 rounded-full bg-subtle"><div className="h-full rounded-full bg-ink" style={{ width: `${(it.value / max) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
