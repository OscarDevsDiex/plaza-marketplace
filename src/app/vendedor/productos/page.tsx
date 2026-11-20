import type { ReactNode } from 'react';
import Link from 'next/link';
import { Archive, ArchiveRestore, Eye, Package, Pause, Play, Search } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { listProducts, PAGE_SIZE, type ProductStatus } from '@/lib/services/seller/queries';
import { setProductStatusAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { ButtonLink, buttonClass } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { DemoBadge, EmptyState, PageHeader, Pagination, Price } from '@/components/ui/misc';
import { FilterTabs, pageParam, param, ProductStatusBadge, td, th, Thumb, withQuery, type SP } from '@/components/seller/ui';
import { PRODUCT_STATUS } from '@/components/seller/constants';
import { cn, formatDate, pluralize } from '@/lib/utils';

export const metadata = { title: 'Productos' };

export default async function SellerProducts({ searchParams }: { searchParams: SP }) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const q = param(sp, 'q').slice(0, 100);
  const raw = param(sp, 'estado');
  const status = Object.hasOwn(PRODUCT_STATUS, raw) ? (raw as ProductStatus) : undefined;
  const page = pageParam(sp);
  const { items, total } = await listProducts(store.id, { q, status, page });
  const href = (o: { estado?: string; pagina?: number }) => withQuery('/vendedor/productos', { q, estado: status, ...o });

  return (
    <>
      <PageHeader title="Productos" description={`${pluralize(total, 'producto', 'productos')} · ${status ? PRODUCT_STATUS[status].label : 'sin archivados'}`}
        actions={<ButtonLink href="/vendedor/productos/nuevo" variant="brand">Publicar producto</ButtonLink>} />

      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <FilterTabs items={[
          { label: 'Todos', href: href({ estado: '' }), active: !status },
          ...(['active', 'draft', 'paused', 'suspended', 'archived'] as const).map((s) => ({ label: PRODUCT_STATUS[s].label, href: href({ estado: s }), active: status === s })),
        ]} />
        <form className="relative w-full sm:w-64" role="search">
          {status && <input type="hidden" name="estado" value={status} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input name="q" defaultValue={q} placeholder="Buscar por título o SKU" aria-label="Buscar productos" className="h-9 pl-9" />
        </form>
      </div>

      {items.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead><tr><th className={th}>Producto</th><th className={th}>Estado</th><th className={th}>Precio</th><th className={th}>Existencias</th><th className={th}>Vendidos</th><th className={th}>Actualizado</th><th className={cn(th, 'text-right')}>Acciones</th></tr></thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-line align-middle hover:bg-subtle/60">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Thumb src={p.image} />
                      <div className="min-w-0">
                        <Link href={`/vendedor/productos/${p.id}`} className="line-clamp-1 max-w-[280px] font-medium hover:underline">{p.title}</Link>
                        {p.isDemo && <DemoBadge />}
                        {p.status === 'suspended' && p.moderationNote && <p className="line-clamp-1 max-w-[280px] text-xs text-danger">{p.moderationNote}</p>}
                      </div>
                    </div>
                  </td>
                  <td className={td}><ProductStatusBadge status={p.status} /></td>
                  <td className={td}><Price price={p.price} salePrice={p.salePrice} size="sm" /></td>
                  <td className={cn(td, 'tabular-nums', p.stock === 0 ? 'font-medium text-danger' : p.stock <= 5 && 'text-warning')}>{p.stock === 0 ? 'Agotado' : p.stock}</td>
                  <td className={cn(td, 'tabular-nums')}>{p.salesCount}</td>
                  <td className={cn(td, 'whitespace-nowrap text-muted')}>{formatDate(p.updatedAt)}</td>
                  <td className={td}>
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/vendedor/productos/${p.id}/vista-previa`} className={buttonClass('ghost', 'sm')} title="Vista previa" aria-label="Vista previa"><Eye className="size-4" /></Link>
                      <Link href={`/vendedor/productos/${p.id}`} className={buttonClass('secondary', 'sm')}>Editar</Link>
                      {p.status === 'active' && <StatusButton id={p.id} to="paused" label="Pausar" icon={<Pause className="size-3.5" />} />}
                      {(p.status === 'paused' || p.status === 'draft') && <StatusButton id={p.id} to="active" label="Publicar" icon={<Play className="size-3.5" />} />}
                      {p.status === 'archived' && <StatusButton id={p.id} to="draft" label="Restaurar" icon={<ArchiveRestore className="size-3.5" />} />}
                      {p.status !== 'archived' && p.status !== 'suspended' && <StatusButton id={p.id} to="archived" label="Archivar" icon={<Archive className="size-3.5" />} danger />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Package className="size-5" />} title={q || status ? 'Sin resultados' : 'Aún no tienes productos'}
          action={q || status ? <ButtonLink href="/vendedor/productos" variant="secondary">Quitar filtros</ButtonLink> : <ButtonLink href="/vendedor/productos/nuevo" variant="brand">Publicar mi primer producto</ButtonLink>}>
          {q || status ? 'Prueba con otra búsqueda o filtro.' : 'Publicar es gratis: solo pagas comisión cuando vendes.'}
        </EmptyState>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={(n) => href({ pagina: n })} />
    </>
  );
}

function StatusButton({ id, to, label, icon, danger }: { id: string; to: ProductStatus; label: string; icon: ReactNode; danger?: boolean }) {
  return (
    <ActionForm action={setProductStatusAction.bind(null, id, to)} hideSuccess className="max-w-56 [&>p]:mt-1 [&>p]:text-xs">
      <SubmitButton size="sm" variant={danger ? 'danger' : 'secondary'}>{icon}{label}</SubmitButton>
    </ActionForm>
  );
}
