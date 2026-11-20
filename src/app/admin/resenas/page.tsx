import Link from 'next/link';
import { and, count, desc, eq, ilike, or } from 'drizzle-orm';
import { MessageSquare } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, likeTerm, one, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { setReviewStatusAction } from '@/actions/admin';
import { Badge, EmptyState, PageHeader, Pagination, Stars } from '@/components/ui/misc';
import { ConfirmAction, Filters, PublicLink, QuickAction } from '@/components/admin/ui';
import { StatusBadge, statusOptions } from '@/components/admin/status';
import { formatDateTime } from '@/lib/utils';

const { reviews, products, stores, users } = schema;
const RATINGS = ['1', '2', '3', '4', '5'] as const;

export default async function AdminReviews({ searchParams }: { searchParams: Promise<SP> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q), status = oneOf(sp.estado, ['published', 'hidden'] as const), rating = oneOf(sp.estrellas, RATINGS), page = pageOf(sp);
  const where = and(
    q ? or(ilike(reviews.body, likeTerm(q)), ilike(reviews.title, likeTerm(q))) : undefined,
    status ? eq(reviews.status, status) : undefined,
    rating ? eq(reviews.rating, Number(rating)) : undefined,
  );
  const [rows, [{ n: total }]] = await Promise.all([
    db.select({
      id: reviews.id, rating: reviews.rating, title: reviews.title, body: reviews.body, status: reviews.status, verified: reviews.verified, createdAt: reviews.createdAt,
      productTitle: products.title, productSlug: products.slug, storeName: stores.name, authorId: users.id, authorName: users.name,
    }).from(reviews)
      .innerJoin(products, eq(products.id, reviews.productId)).innerJoin(stores, eq(stores.id, reviews.storeId)).innerJoin(users, eq(users.id, reviews.userId))
      .where(where).orderBy(desc(reviews.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(reviews).where(where),
  ]);

  return (
    <>
      <PageHeader title="Reseñas" description="Ocultar una reseña la retira del producto y recalcula las calificaciones." />
      <Filters base="/admin/resenas" q={q} placeholder="Buscar en el texto" total={total}
        selects={[
          { name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('review') },
          { name: 'estrellas', value: rating, all: 'Todas las calificaciones', options: RATINGS.map((r) => [r, `${r} ★`]) },
        ]} />
      {rows.length === 0 ? (
        <EmptyState icon={<MessageSquare className="size-5" />} title="Sin reseñas">No hay reseñas que coincidan con los filtros.</EmptyState>
      ) : (
        <ul className="card divide-y divide-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-4 sm:px-5">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Stars value={r.rating} size={13} />
                  <StatusBadge kind="review" value={r.status} />
                  {r.verified && <Badge tone="success">Compra verificada</Badge>}
                  <span className="text-xs text-muted">{formatDateTime(r.createdAt)}</span>
                </div>
                {r.title && <p className="text-sm font-medium">{r.title}</p>}
                <p className="line-clamp-3 text-sm text-ink-2 whitespace-pre-line">{r.body}</p>
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
                  <span>Por <Link href={`/admin/usuarios/${r.authorId}`} className="hover:underline">{r.authorName}</Link></span>·
                  <span>{r.productTitle} ({r.storeName})</span>
                  <PublicLink href={`/producto/${r.productSlug}#resenas`}>Ver</PublicLink>
                </p>
              </div>
              {r.status === 'published' ? (
                <ConfirmAction action={setReviewStatusAction.bind(null, r.id)} label="Ocultar" hidden={{ status: 'hidden' }} confirm="Ocultar la reseña del sitio" />
              ) : (
                <QuickAction action={setReviewStatusAction.bind(null, r.id)} hidden={{ status: 'published' }}>Publicar</QuickAction>
              )}
            </li>
          ))}
        </ul>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/resenas', sp)} />
    </>
  );
}
