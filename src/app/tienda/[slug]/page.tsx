import type { Metadata } from 'next';
import { Suspense, cache } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, CalendarDays, Package, ShoppingBag, Users, MessageSquare, BadgeCheck } from 'lucide-react';
import { getStorePage, listStoreReviews, searchProducts } from '@/lib/services/catalog';
import { getCurrentUser } from '@/lib/auth/session';
import { isFollowing } from '@/lib/services/community';
import { toggleFollowAction, reportAction } from '@/actions/shop';
import { FollowButton, ReportForm } from '@/components/community/toggles';
import { ProductGrid } from '@/components/product/product-card';
import { DemoBadge, EmptyState, Pagination, Skeleton, Stars } from '@/components/ui/misc';
import { Select } from '@/components/ui/form';
import { buttonClass } from '@/components/ui/button';
import { LIMITS, APP_URL } from '@/lib/config';
import { formatDate, pluralize } from '@/lib/utils';

const load = cache(getStorePage);

export async function generateMetadata(props: PageProps<'/tienda/[slug]'>): Promise<Metadata> {
  const s = await load((await props.params).slug);
  if (!s) return { title: 'Tienda no encontrada' };
  const description = s.description.slice(0, 155) || `Productos de ${s.name} en Plaza.`;
  return { title: s.name, description, alternates: { canonical: `/tienda/${s.slug}` }, openGraph: { title: s.name, description, images: s.bannerUrl ? [{ url: s.bannerUrl }] : undefined } };
}

export default async function StorePage(props: PageProps<'/tienda/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([props.params, props.searchParams]);
  const s = await load(slug);
  if (!s) notFound();
  const page = Math.max(1, Number(sp.page) || 1);
  const sort = typeof sp.sort === 'string' ? sp.sort : '';
  const [{ items, total }, reviews] = await Promise.all([searchProducts({ store: s.slug, sort, page }), listStoreReviews(s.id)]);
  const jsonLd = {
    '@context': 'https://schema.org', '@type': 'Store', name: s.name, description: s.description, url: `${APP_URL}/tienda/${s.slug}`,
    image: s.logoUrl ?? undefined, address: s.city ? { '@type': 'PostalAddress', addressLocality: s.city, addressRegion: s.state, addressCountry: 'MX' } : undefined,
    aggregateRating: s.ratingCount ? { '@type': 'AggregateRating', ratingValue: Number(s.ratingAvg).toFixed(1), reviewCount: s.ratingCount } : undefined,
  };

  return (
    <main className="mx-auto max-w-[1400px] px-4 pb-10 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <div className="relative mt-6 h-40 overflow-hidden rounded-2xl bg-subtle sm:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {s.bannerUrl && <img src={s.bannerUrl} alt="" className="size-full object-cover" fetchPriority="high" />}
      </div>
      <section className="relative -mt-10 flex flex-wrap items-end gap-5 px-2 sm:px-6">
        <div className="grid size-24 place-items-center overflow-hidden rounded-2xl bg-surface text-3xl font-semibold shadow-lift ring-4 ring-canvas">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {s.logoUrl ? <img src={s.logoUrl} alt={`Logo de ${s.name}`} className="size-full object-cover" /> : s.name[0]}
        </div>
        <div className="min-w-0 flex-1 pb-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold sm:text-3xl">{s.name}{s.isDemo && <DemoBadge />}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            {s.ratingCount > 0 && <span className="flex items-center gap-1.5"><Stars value={Number(s.ratingAvg)} /><span className="font-medium text-ink">{Number(s.ratingAvg).toFixed(1)}</span>({pluralize(s.ratingCount, 'reseña', 'reseñas')})</span>}
            {s.city && <span className="flex items-center gap-1"><MapPin className="size-3.5" />{s.city}{s.state ? `, ${s.state}` : ''}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 pb-1">
          <Suspense fallback={<Skeleton className="h-8 w-28" />}><Follow storeId={s.id} slug={s.slug} ownerId={s.ownerId} /></Suspense>
        </div>
      </section>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          [Package, 'Productos', s.productCount.toLocaleString('es-MX')],
          [ShoppingBag, 'Ventas', s.salesCount.toLocaleString('es-MX')],
          [Users, 'Seguidores', s.followers.toLocaleString('es-MX')],
          [MessageSquare, 'Responde reseñas en', s.responseHours == null ? '—' : s.responseHours < 24 ? `~${Math.max(1, Math.round(s.responseHours))} h` : `~${Math.round(s.responseHours / 24)} días`],
          [CalendarDays, 'En Plaza desde', formatDate(s.createdAt)],
        ].map(([Icon, label, value]) => {
          const I = Icon as typeof Package;
          return <div key={label as string} className="card p-4"><dt className="flex items-center gap-1.5 text-xs text-muted"><I className="size-3.5" />{label as string}</dt><dd className="mt-1 text-lg font-semibold tabular-nums">{value as string}</dd></div>;
        })}
      </dl>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
        <section aria-label="Productos de la tienda">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Productos <span className="text-base font-normal text-muted">({total})</span></h2>
            <form className="flex items-center gap-2">
              <Select name="sort" defaultValue={sort} className="h-9 w-48" aria-label="Ordenar">
                <option value="">Más vendidos</option><option value="nuevos">Más recientes</option><option value="precio-asc">Menor precio</option><option value="precio-desc">Mayor precio</option><option value="calificacion">Mejor calificados</option>
              </Select>
              <button className={buttonClass('secondary', 'sm', 'h-9')}>Aplicar</button>
            </form>
          </div>
          {items.length ? (
            <>
              <ProductGrid items={items} className="xl:grid-cols-4" />
              <Pagination page={page} total={total} pageSize={LIMITS.pageSize} href={(n) => `/tienda/${s.slug}?${new URLSearchParams({ ...(sort && { sort }), ...(n > 1 && { page: String(n) }) })}`} />
            </>
          ) : <EmptyState title="Esta tienda aún no tiene productos publicados" />}
        </section>
        <aside className="space-y-6">
          {s.description && <div className="card p-5"><h2 className="text-sm font-semibold">Acerca de la tienda</h2><p className="mt-2 text-sm leading-relaxed whitespace-pre-line text-ink-2">{s.description}</p></div>}
          <div className="card p-5">
            <h2 className="text-sm font-semibold">Reseñas recientes</h2>
            {reviews.length === 0 ? <p className="mt-2 text-sm text-muted">Aún no hay reseñas.</p> : (
              <ul className="mt-3 divide-y divide-line">
                {reviews.map((r) => (
                  <li key={r.id} className="py-3 text-sm">
                    <div className="flex items-center gap-2"><Stars value={r.rating} size={12} /><span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck className="size-3" />Verificada</span></div>
                    <p className="mt-1 line-clamp-3 text-ink-2">{r.body}</p>
                    <Link href={`/producto/${r.product.slug}#resenas`} className="mt-1 block truncate text-xs text-muted hover:text-ink">{r.product.title}</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <ReportForm action={reportAction} targetType="store" targetId={s.id} label="Reportar esta tienda" />
        </aside>
      </div>
    </main>
  );
}

async function Follow({ storeId, slug, ownerId }: { storeId: string; slug: string; ownerId: string }) {
  const user = await getCurrentUser();
  if (user?.id === ownerId) return <Link href="/vendedor/tienda" className={buttonClass('secondary', 'sm')}>Editar mi tienda</Link>;
  return <FollowButton action={toggleFollowAction.bind(null, storeId, slug)} initial={user ? await isFollowing(user.id, storeId) : false} />;
}
