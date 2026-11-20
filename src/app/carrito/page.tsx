import type { Metadata } from 'next';
import Link from 'next/link';
import { ShoppingBag, AlertTriangle, Store, ShieldCheck, Truck } from 'lucide-react';
import { loadCart } from '@/lib/services/cart';
import { getCurrentUser } from '@/lib/auth/session';
import { QtySelect } from '@/components/cart/qty-select';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/misc';
import { formatMoney, pluralize } from '@/lib/utils';

export const metadata: Metadata = { title: 'Carrito', robots: { index: false } };

export default async function CartPage() {
  const [cart, user] = await Promise.all([loadCart(), getCurrentUser()]);
  if (!cart.groups.length) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={<ShoppingBag className="size-5" />} title="Tu carrito está vacío" action={<ButtonLink href="/">Descubrir productos</ButtonLink>}>
          Explora las ofertas del día o busca lo que necesitas.
        </EmptyState>
      </main>
    );
  }
  const stores = cart.groups.length;
  return (
    <main className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold">Carrito <span className="text-base font-normal text-muted">({pluralize(cart.totals.items, 'artículo', 'artículos')})</span></h1>
      {stores > 1 && <p className="mt-1 text-sm text-muted">Tu compra incluye {stores} tiendas: cada una envía su parte por separado.</p>}
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {cart.groups.map((g) => (
            <section key={g.store.id} className="card overflow-hidden" aria-label={`Productos de ${g.store.name}`}>
              <header className="flex items-center justify-between gap-3 border-b border-line bg-subtle/60 px-5 py-3">
                <Link href={`/tienda/${g.store.slug}`} className="flex items-center gap-2 text-sm font-medium hover:underline"><Store className="size-4 text-muted" />{g.store.name}</Link>
                <span className="text-xs text-muted">
                  {g.shipping === 0 ? <span className="text-success">Envío gratis</span> : g.freeShippingOver != null
                    ? <>Te faltan {formatMoney(Math.max(0, g.freeShippingOver - (g.subtotal - g.discount)))} para envío gratis</>
                    : <>Envío {formatMoney(g.shipping)}</>}
                </span>
              </header>
              <ul className="divide-y divide-line">
                {g.lines.map((l) => (
                  <li key={l.variantId} className="flex gap-4 p-5">
                    <Link href={`/producto/${l.slug}`} className="size-20 shrink-0 overflow-hidden rounded-lg bg-subtle sm:size-24">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {l.image && <img src={l.image} alt="" className="size-full object-cover" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between gap-4">
                        <div className="min-w-0">
                          <Link href={`/producto/${l.slug}`} className="line-clamp-2 text-sm font-medium hover:underline">{l.title}</Link>
                          {l.variantName !== 'Único' && <div className="mt-0.5 text-xs text-muted">{l.variantName}</div>}
                        </div>
                        <div className="text-right">
                          <div className="font-semibold tabular-nums">{formatMoney(l.unitPrice * l.quantity)}</div>
                          {l.quantity > 1 && <div className="text-xs text-muted tabular-nums">{formatMoney(l.unitPrice)} c/u</div>}
                          {l.listPrice > l.unitPrice && <s className="text-xs text-muted tabular-nums">{formatMoney(l.listPrice * l.quantity)}</s>}
                        </div>
                      </div>
                      {l.problem && <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-danger"><AlertTriangle className="size-3.5" />{l.problem}{l.stock > 0 && l.available && ' · ajusta la cantidad'}</p>}
                      <div className="mt-3"><QtySelect variantId={l.variantId} quantity={l.quantity} max={l.stock} /></div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside className="lg:sticky lg:top-32 lg:self-start">
          <div className="card p-5">
            <h2 className="font-semibold">Resumen</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted">Productos</dt><dd className="tabular-nums">{formatMoney(cart.totals.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Envío{stores > 1 ? ` (${stores} tiendas)` : ''}</dt><dd className="tabular-nums">{cart.totals.shipping ? formatMoney(cart.totals.shipping) : <span className="text-success">Gratis</span>}</dd></div>
              <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{formatMoney(cart.totals.total)}</dd></div>
            </dl>
            <p className="mt-2 text-xs text-muted">Los cupones de cada tienda se aplican en el siguiente paso.</p>
            {cart.hasProblems ? (
              <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">Ajusta los productos marcados para continuar.</p>
            ) : (
              <ButtonLink href={user ? '/checkout' : '/entrar?next=/checkout'} size="lg" className="mt-5 w-full">{user ? 'Continuar compra' : 'Inicia sesión para comprar'}</ButtonLink>
            )}
            <ul className="mt-5 space-y-2 border-t border-line pt-4 text-xs text-muted">
              <li className="flex gap-2"><ShieldCheck className="size-4 shrink-0" />Compra protegida: recibe lo que pediste o te devolvemos tu dinero.</li>
              <li className="flex gap-2"><Truck className="size-4 shrink-0" />Seguimiento de cada envío desde tu cuenta.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
