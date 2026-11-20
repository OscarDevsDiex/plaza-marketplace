import Link from 'next/link';
import { ShieldCheck, Truck, RotateCcw, Lock } from 'lucide-react';
import { APP_NAME } from '@/lib/config';
import { Logo } from './logo';

const cols: [string, [string, string][]][] = [
  ['Compra', [['Todas las categorías', '/buscar'], ['Ofertas', '/ofertas'], ['Novedades', '/buscar?sort=nuevos'], ['Mejor calificados', '/buscar?sort=calificacion']]],
  ['Vende', [['Abre tu tienda', '/vender'], ['Panel de vendedor', '/vendedor'], ['Comisiones', '/ayuda/comisiones'], ['Términos para vendedores', '/legal/vendedores']]],
  ['Ayuda', [['Mis compras', '/cuenta/pedidos'], ['Compra protegida', '/ayuda/compra-protegida'], ['Envíos', '/ayuda/envios'], ['Devoluciones', '/ayuda/devoluciones']]],
  ['Legal', [['Términos y condiciones', '/legal/terminos'], ['Aviso de privacidad', '/legal/privacidad']]],
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-surface">
      <div className="mx-auto grid max-w-[1400px] gap-6 border-b border-line px-4 py-8 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        {[
          [ShieldCheck, 'Compra protegida', 'Si no llega o no es lo que pediste, te devolvemos tu dinero.'],
          [Lock, 'Pagos seguros', 'Procesados por Stripe o Mercado Pago. Nunca guardamos tu tarjeta.'],
          [Truck, 'Envíos con seguimiento', 'Sigue tu paquete desde tu cuenta.'],
          [RotateCcw, 'Reseñas verificadas', 'Solo opinan quienes compraron y recibieron el producto.'],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof ShieldCheck;
          return (
            <div key={t as string} className="flex gap-3">
              <I className="mt-0.5 size-5 shrink-0 text-ink" />
              <div><div className="text-sm font-medium">{t as string}</div><div className="text-[13px] text-muted">{d as string}</div></div>
            </div>
          );
        })}
      </div>
      <div className="mx-auto grid max-w-[1400px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-muted">El marketplace donde cualquier persona puede abrir su tienda y vender a todo México.</p>
        </div>
        {cols.map(([title, links]) => (
          <div key={title}>
            <h4 className="text-[13px] font-semibold">{title}</h4>
            <ul className="mt-3 space-y-2 text-sm">
              {links.map(([l, h]) => <li key={h}><Link href={h} className="text-muted transition-colors hover:text-ink">{l}</Link></li>)}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-[1400px] flex-wrap justify-between gap-2 border-t border-line px-4 py-5 text-xs text-muted sm:px-6">
        <span>© {APP_NAME}. Todos los derechos reservados.</span>
        <span>Precios en pesos mexicanos (MXN), IVA incluido.</span>
      </div>
    </footer>
  );
}
