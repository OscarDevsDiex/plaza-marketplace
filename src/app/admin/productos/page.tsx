import Link from 'next/link';
import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm';
import { Package } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, isUuid, likeTerm, one, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { moderateProductAction } from '@/actions/admin';
import { DemoBadge, EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { ConfirmAction, DataTable, Filters, PublicLink, QuickAction, td, tr } from '@/components/admin/ui';
import { StatusBadge, statusOptions } from '@/components/admin/status';
import { formatDate, formatMoney } from '@/lib/utils';

const { products, stores, categories } = schema;
const STATUSES = ['draft', 'active', 'paused', 'suspended', 'archived'] as const;

export default async function AdminProducts({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q), status = oneOf(sp.estado, STATUSES), page = pageOf(sp);
  const storeId = isUuid(one(sp.tienda)) ? one(sp.tienda) : '';
  const where = and(
    q ? or(ilike(products.title, likeTerm(q)), ilike(products.slug, likeTerm(q)), ilike(products.sku, likeTerm(q))) : undefined,
    status ? eq(products.status, status) : undefined,
    storeId ? eq(products.storeId, storeId) : undefined,
  );
  const [rows, [{ n: total }], storeList] = await Promise.all([
    db.select({
      id: products.id, title: products.title, slug: products.slug, status: products.status, price: products.price, salePrice: products.salePrice,
      isDemo: products.isDemo, moderationNote: products.moderationNote, createdAt: products.createdAt, salesCount: products.salesCount,
      storeId: products.storeId, storeName: stores.name, category: categories.name,
    }).from(products).innerJoin(stores, eq(stores.id, products.storeId)).innerJoin(categories, eq(categories.id, products.categoryId))
      .where(where).orderBy(desc(products.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(products).where(where),
    // shortcut: lista completa de tiendas en el filtro; con miles de tiendas, cambiar a búsqueda por nombre.
    db.select({ id: stores.id, name: stores.name }).from(stores).orderBy(asc(stores.name)).limit(500),
  ]);

  return (
    <>
      <PageHeader title="Productos" description="Moderación del catálogo. Suspender un producto lo oculta y avisa a la tienda." />
      <Filters base="/admin/productos" q={q} placeholder="Título, slug o SKU" total={total}
        selects={[
          { name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('product') },
          { name: 'tienda', value: storeId, all: 'Todas las tiendas', options: storeList.map((s) => [s.id, s.name]) },
        ]} />
      {rows.length === 0 ? (
        <EmptyState icon={<Package className="size-5" />} title="Sin productos">No hay productos que coincidan con los filtros.</EmptyState>
      ) : (
        <DataTable head={['Producto', 'Tienda', 'Categoría', 'Precio', 'Vendidos', 'Estado', 'Alta', '']}>
          {rows.map((p) => (
            <tr key={p.id} className={tr}>
              <td className={`${td} max-w-xs`}>
                <div className="flex items-center gap-1.5 font-medium"><span className="truncate">{p.title}</span>{p.isDemo && <DemoBadge />}</div>
                <PublicLink href={`/producto/${p.slug}`}>Ver producto</PublicLink>
                {p.status === 'suspended' && p.moderationNote && <p className="mt-1 text-xs text-danger">Nota: {p.moderationNote}</p>}
              </td>
              <td className={td}><Link href={`/admin/productos?tienda=${p.storeId}`} className="text-ink-2 hover:underline">{p.storeName}</Link></td>
              <td className={`${td} text-muted`}>{p.category}</td>
              <td className={`${td} whitespace-nowrap tabular-nums`}>{formatMoney(p.salePrice ?? p.price)}</td>
              <td className={`${td} tabular-nums`}>{p.salesCount}</td>
              <td className={td}><StatusBadge kind="product" value={p.status} /></td>
              <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(p.createdAt)}</td>
              <td className={td}>
                <div className="flex flex-wrap justify-end gap-2">
                  {p.status !== 'suspended' && p.status !== 'archived' && (
                    <ConfirmAction action={moderateProductAction.bind(null, p.id)} label="Suspender" hidden={{ op: 'suspend' }}
                      reason={{ label: 'Nota de moderación (se envía a la tienda)', required: true }} confirm="Suspender y ocultar el producto" />
                  )}
                  {(p.status === 'suspended' || p.status === 'archived') && (
                    <QuickAction action={moderateProductAction.bind(null, p.id)} hidden={{ op: 'reactivate' }}>Reactivar</QuickAction>
                  )}
                  {p.status !== 'archived' && (
                    <ConfirmAction action={moderateProductAction.bind(null, p.id)} label="Archivar" variant="secondary" hidden={{ op: 'archive' }}
                      confirm="Archivar el producto (deja de mostrarse)" />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/productos', sp)} />
    </>
  );
}
