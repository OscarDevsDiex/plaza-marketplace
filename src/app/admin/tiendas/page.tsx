import Link from 'next/link';
import { and, count, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { Store } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { EARNING_STATUSES, PAGE_SIZE, likeTerm, money, one, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { setStoreStatusAction } from '@/actions/admin';
import { DemoBadge, EmptyState, PageHeader, Pagination, Stars } from '@/components/ui/misc';
import { ConfirmAction, DataTable, Filters, PublicLink, td, tr, linkClass } from '@/components/admin/ui';
import { StatusBadge, statusOptions } from '@/components/admin/status';
import { formatDate, formatMoney } from '@/lib/utils';

const { stores, users, products, sellerOrders } = schema;

export default async function AdminStores({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q), status = oneOf(sp.estado, ['active', 'suspended'] as const), page = pageOf(sp);
  const where = and(
    q ? or(ilike(stores.name, likeTerm(q)), ilike(stores.slug, likeTerm(q)), ilike(users.email, likeTerm(q))) : undefined,
    status ? eq(stores.status, status) : undefined,
  );
  const [rows, [{ n: total }]] = await Promise.all([
    db.select({
      id: stores.id, name: stores.name, slug: stores.slug, status: stores.status, isDemo: stores.isDemo, createdAt: stores.createdAt,
      ratingAvg: stores.ratingAvg, ratingCount: stores.ratingCount, ownerId: users.id, ownerName: users.name, ownerEmail: users.email,
      products: sql<number>`(select count(*)::int from ${products} where ${products.storeId} = "stores"."id")`,
      sales: money(sql`(select sum(${sellerOrders.total}) from ${sellerOrders} where ${sellerOrders.storeId} = "stores"."id" and ${inArray(sellerOrders.status, [...EARNING_STATUSES])})`),
    }).from(stores).innerJoin(users, eq(users.id, stores.ownerId)).where(where)
      .orderBy(desc(stores.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(stores).innerJoin(users, eq(users.id, stores.ownerId)).where(where),
  ]);

  return (
    <>
      <PageHeader title="Tiendas" description="Vendedores del marketplace. Suspender una tienda la notifica por correo." />
      <Filters base="/admin/tiendas" q={q} placeholder="Nombre, slug o correo del dueño" total={total}
        selects={[{ name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('store') }]} />
      {rows.length === 0 ? (
        <EmptyState icon={<Store className="size-5" />} title="Sin tiendas">No hay tiendas que coincidan con los filtros.</EmptyState>
      ) : (
        <DataTable head={['Tienda', 'Dueño', 'Estado', 'Productos', 'Ventas', 'Calificación', 'Alta', '']}>
          {rows.map((s) => (
            <tr key={s.id} className={tr}>
              <td className={td}>
                <div className="flex items-center gap-1.5 font-medium">{s.name}{s.isDemo && <DemoBadge />}</div>
                <PublicLink href={`/tienda/${s.slug}`}>/tienda/{s.slug}</PublicLink>
              </td>
              <td className={td}>
                <Link href={`/admin/usuarios/${s.ownerId}`} className={linkClass}>{s.ownerName}</Link>
                <div className="text-xs text-muted">{s.ownerEmail}</div>
              </td>
              <td className={td}><StatusBadge kind="store" value={s.status} /></td>
              <td className={`${td} tabular-nums`}><Link href={`/admin/productos?tienda=${s.id}`} className="hover:underline">{s.products}</Link></td>
              <td className={`${td} tabular-nums`}>{formatMoney(s.sales)}</td>
              <td className={td}>{s.ratingCount ? <span className="flex items-center gap-1.5"><Stars value={s.ratingAvg} size={12} /><span className="text-xs text-muted">({s.ratingCount})</span></span> : <span className="text-faint">—</span>}</td>
              <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(s.createdAt)}</td>
              <td className={td}>
                <div className="flex justify-end">
                  {s.status === 'active' ? (
                    <ConfirmAction action={setStoreStatusAction.bind(null, s.id)} label="Suspender" hidden={{ status: 'suspended' }}
                      reason={{ label: 'Motivo (se envía al dueño)', required: true }} confirm="Suspender la tienda y avisar al dueño" />
                  ) : (
                    <ConfirmAction action={setStoreStatusAction.bind(null, s.id)} label="Reactivar" variant="secondary" hidden={{ status: 'active' }}
                      reason={{ label: 'Mensaje para el dueño', required: true, placeholder: 'Ej. Revisamos tu caso y tu tienda vuelve a estar activa.' }} />
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/tiendas', sp)} />
    </>
  );
}
