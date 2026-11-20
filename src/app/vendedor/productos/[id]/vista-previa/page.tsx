import { notFound } from 'next/navigation';
import { Eye, ImageIcon, Truck } from 'lucide-react';
import { z } from 'zod';
import { requireSeller } from '@/lib/auth/guards';
import { getProductForStore } from '@/lib/services/seller/queries';
import { BackLink } from '@/components/dashboard-shell';
import { ButtonLink } from '@/components/ui/button';
import { Badge, Price } from '@/components/ui/misc';
import { ProductStatusBadge } from '@/components/seller/ui';
import { CONDITIONS } from '@/components/seller/constants';
import { cn, formatMoney } from '@/lib/utils';

export const metadata = { title: 'Vista previa' };

/** Muestra el producto como lo vería un comprador, aunque no esté publicado. */
export default async function ProductPreview({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireSeller();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const product = await getProductForStore(store.id, id);
  if (!product) notFound();
  const [cover, ...rest] = product.images;
  const stock = product.variants.reduce((t, v) => t + v.stock, 0);
  const category = product.category.parent ? `${product.category.parent.name} › ${product.category.name}` : product.category.name;

  return (
    <>
      <BackLink href={`/vendedor/productos/${product.id}`}>Editar producto</BackLink>
      <div className={cn('mb-6 flex flex-wrap items-center gap-3 rounded-xl px-4 py-3 text-sm', product.status === 'active' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning')}>
        <Eye className="size-4 shrink-0" />
        <span className="flex-1 font-medium">{product.status === 'active' ? 'Vista previa — así lo ven los compradores' : 'Vista previa — no publicada. Los compradores aún no pueden ver este producto.'}</span>
        <ProductStatusBadge status={product.status} />
        <ButtonLink href={`/vendedor/productos/${product.id}`} size="sm" variant="secondary">Editar</ButtonLink>
      </div>

      <article className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="card aspect-square overflow-hidden">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element -- imagen ya optimizada al subirla
              <img src={cover.url} alt={cover.alt ?? product.title} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-faint"><ImageIcon className="size-10" /><span className="text-sm">Sin imágenes</span></div>
            )}
          </div>
          {rest.length > 0 && (
            <div className="grid grid-cols-5 gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- miniaturas ya optimizadas */}
              {rest.map((im) => <img key={im.id} src={im.thumbUrl ?? im.url} alt="" className="aspect-square w-full rounded-lg border border-line object-cover" />)}
            </div>
          )}
        </div>

        <div>
          <p className="text-xs text-muted">{store.name} · {category}</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{product.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {product.condition !== 'new' && <Badge>{CONDITIONS[product.condition]}</Badge>}
            {product.brand && <Badge tone="info">{product.brand}</Badge>}
          </div>
          <Price price={product.price} salePrice={product.salePrice} size="lg" className="mt-4" />
          <p className={cn('mt-1 text-sm', stock === 0 ? 'text-danger' : stock <= 5 ? 'text-warning' : 'text-success')}>
            {stock === 0 ? 'Sin existencias' : stock <= 5 ? `Últimas ${stock} piezas` : 'Disponible'}
          </p>

          {product.variants.length > 1 || product.variants[0]?.name !== 'Único' ? (
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium">Opciones</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((v) => (
                  <span key={v.id} className={cn('rounded-lg border px-3 py-2 text-sm', v.stock ? 'border-line-strong' : 'border-line text-faint line-through')}>
                    {v.name}{v.priceOverride != null && <span className="ml-1.5 text-muted">{formatMoney(v.priceOverride)}</span>}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card mt-6 flex items-start gap-3 p-4 text-sm">
            <Truck className="mt-0.5 size-4 shrink-0 text-muted" />
            <div className="text-ink-2">{product.shippingInfo || 'Envío a todo México. El costo se calcula en el carrito.'}</div>
          </div>

          <section className="mt-8">
            <h2 className="mb-2 text-base font-semibold">Descripción</h2>
            {product.description ? <p className="whitespace-pre-line text-sm leading-relaxed text-ink-2">{product.description}</p> : <p className="text-sm text-muted">Sin descripción.</p>}
          </section>

          {(product.weightGrams || product.lengthCm || product.sku) && (
            <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
              {product.sku && <><dt className="text-muted">SKU</dt><dd>{product.sku}</dd></>}
              {product.weightGrams != null && <><dt className="text-muted">Peso</dt><dd>{product.weightGrams.toLocaleString('es-MX')} g</dd></>}
              {product.lengthCm != null && <><dt className="text-muted">Medidas</dt><dd>{product.lengthCm} × {product.widthCm ?? '—'} × {product.heightCm ?? '—'} cm</dd></>}
            </dl>
          )}
        </div>
      </article>
    </>
  );
}
