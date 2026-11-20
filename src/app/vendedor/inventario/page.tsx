import Link from 'next/link';
import { Boxes, Search } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { listInventory, PAGE_SIZE, type StockFilter } from '@/lib/services/seller/queries';
import { updateStockAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { ButtonLink } from '@/components/ui/button';
import { Input } from '@/components/ui/form';
import { Badge, EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { FilterTabs, pageParam, param, ProductStatusBadge, td, th, Thumb, withQuery, type SP } from '@/components/seller/ui';
import { cn } from '@/lib/utils';

export const metadata = { title: 'Inventario' };

export default async function SellerInventory({ searchParams }: { searchParams: SP }) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const raw = param(sp, 'filtro');
  const filter: StockFilter = raw === 'bajo' || raw === 'agotados' ? raw : undefined;
  const q = param(sp, 'q').slice(0, 100);
  const page = pageParam(sp);
  const { items, total, counts } = await listInventory(store.id, { filter, q, page });
  const href = (o: { filtro?: string; pagina?: number }) => withQuery('/vendedor/inventario', { q, filtro: filter, ...o });

  return (
    <>
      <PageHeader title="Inventario" description="Existencias de cada variante. Escribe la cantidad real que tienes y guarda; registramos el ajuste." />
      <div className="mb-1 flex flex-wrap items-start justify-between gap-3">
        <FilterTabs items={[
          { label: 'Todas', href: href({ filtro: '' }), active: !filter, count: counts.all },
          { label: 'Bajo inventario (≤5)', href: href({ filtro: 'bajo' }), active: filter === 'bajo', count: counts.low },
          { label: 'Agotadas', href: href({ filtro: 'agotados' }), active: filter === 'agotados', count: counts.out },
        ]} />
        <form className="relative w-full sm:w-64" role="search">
          {filter && <input type="hidden" name="filtro" value={filter} />}
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" />
          <Input name="q" defaultValue={q} placeholder="Producto, variante o SKU" aria-label="Buscar en inventario" className="h-9 pl-9" />
        </form>
      </div>

      {items.length ? (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr><th className={th}>Producto</th><th className={th}>Variante</th><th className={th}>SKU</th><th className={th}>Estado</th><th className={th}>Existencias</th></tr></thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-t border-line hover:bg-subtle/60">
                  <td className={td}>
                    <div className="flex items-center gap-3"><Thumb src={v.image} size={36} /><Link href={`/vendedor/productos/${v.productId}`} className="line-clamp-1 max-w-[260px] font-medium hover:underline">{v.title}</Link></div>
                  </td>
                  <td className={td}>{v.name}</td>
                  <td className={cn(td, 'font-mono text-xs text-muted')}>{v.sku ?? '—'}</td>
                  <td className={td}><ProductStatusBadge status={v.status} /></td>
                  <td className={td}>
                    <ActionForm action={updateStockAction.bind(null, v.id)} hideSuccess className="[&>p]:mt-1 [&>p]:text-xs">
                      <div className="flex items-center gap-2">
                        <Input name="stock" type="number" min={0} max={100000} step={1} required defaultValue={v.stock} aria-label={`Existencias de ${v.title} ${v.name}`} className="h-8 w-24 tabular-nums" />
                        <SubmitButton size="sm" variant="secondary">Guardar</SubmitButton>
                        {v.stock === 0 ? <Badge tone="danger">Agotado</Badge> : v.stock <= 5 && <Badge tone="warning">Bajo</Badge>}
                      </div>
                    </ActionForm>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={<Boxes className="size-5" />} title={filter || q ? 'Nada por aquí' : 'Aún no tienes inventario'}
          action={filter || q ? <ButtonLink href="/vendedor/inventario" variant="secondary">Ver todo</ButtonLink> : <ButtonLink href="/vendedor/productos/nuevo" variant="brand">Publicar producto</ButtonLink>}>
          {filter === 'agotados' ? 'Ninguna variante está agotada.' : filter === 'bajo' ? 'Ninguna variante tiene 5 piezas o menos.' : q ? 'No encontramos variantes con esa búsqueda.' : 'Publica un producto para administrar sus existencias.'}
        </EmptyState>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={(n) => href({ pagina: n })} />
    </>
  );
}
