import { notFound } from 'next/navigation';
import { CircleCheck, Eye, TriangleAlert } from 'lucide-react';
import { z } from 'zod';
import { requireSeller } from '@/lib/auth/guards';
import { getCategoryTree } from '@/lib/services/catalog';
import { getProductForStore } from '@/lib/services/seller/queries';
import { saveProductAction } from '@/actions/seller';
import { BackLink } from '@/components/dashboard-shell';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/misc';
import { ProductForm } from '@/components/seller/product-form';
import { param, ProductStatusBadge, type SP } from '@/components/seller/ui';

export const metadata = { title: 'Editar producto' };

const SAVED: Record<string, string> = {
  active: 'Producto publicado. Ya es visible para los compradores.',
  draft: 'Borrador guardado. No es visible para los compradores.',
  paused: 'Cambios guardados. El producto sigue pausado.',
  archived: 'Cambios guardados. El producto sigue archivado.',
  suspended: 'Cambios guardados. El producto sigue suspendido por moderación.',
};

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { store } = await requireSeller();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [product, categories, sp] = await Promise.all([getProductForStore(store.id, id), getCategoryTree(), searchParams]);
  if (!product) notFound();
  const saved = SAVED[param(sp, 'guardado')];

  return (
    <>
      <BackLink href="/vendedor/productos">Productos</BackLink>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{product.title}<ProductStatusBadge status={product.status} /></span>}
        description={product.status === 'active' ? <a href={`/producto/${product.slug}`} className="link" target="_blank" rel="noreferrer">Ver en la tienda ↗</a> : 'Edita la información y guarda los cambios.'}
        actions={<ButtonLink href={`/vendedor/productos/${product.id}/vista-previa`} variant="secondary"><Eye className="size-4" />Vista previa</ButtonLink>}
      />
      {saved && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2 text-sm text-success animate-fade-up"><CircleCheck className="size-4" />{saved}</p>
      )}
      {product.status === 'suspended' && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <span>Suspendido por moderación{product.moderationNote ? `: ${product.moderationNote}` : '.'} Corrige la publicación y contacta a soporte para revisarla.</span>
        </p>
      )}
      <ProductForm
        key={product.updatedAt.toISOString()}
        action={saveProductAction.bind(null, product.id)}
        categories={categories}
        product={{ ...product, images: product.images.map((i) => ({ id: i.id, url: i.url, thumbUrl: i.thumbUrl })), variants: product.variants.map((v) => ({ id: v.id, name: v.name, sku: v.sku, priceOverride: v.priceOverride, stock: v.stock })) }}
      />
    </>
  );
}
