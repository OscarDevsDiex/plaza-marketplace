import Link from 'next/link';
import { BadgeCheck, MessageSquare, Star } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { getStoreRating, listStoreReviews, PAGE_SIZE } from '@/lib/services/seller/queries';
import { respondReviewAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Textarea } from '@/components/ui/form';
import { Badge, EmptyState, PageHeader, Pagination, Stars } from '@/components/ui/misc';
import { FilterTabs, pageParam, param, withQuery, type SP } from '@/components/seller/ui';
import { formatDate } from '@/lib/utils';

export const metadata = { title: 'Reseñas' };

export default async function SellerReviews({ searchParams }: { searchParams: SP }) {
  const { store } = await requireSeller();
  const sp = await searchParams;
  const rating = Number(param(sp, 'calificacion'));
  const r = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : undefined;
  const unanswered = param(sp, 'sin_responder') === '1';
  const page = pageParam(sp);
  const [{ items, total, dist, unanswered: pending }, summary] = await Promise.all([
    listStoreReviews(store.id, { rating: r, unanswered, page }),
    getStoreRating(store.id),
  ]);
  const href = (o: { calificacion?: number | ''; sin_responder?: string; pagina?: number }) =>
    withQuery('/vendedor/resenas', { calificacion: r, sin_responder: unanswered ? '1' : '', ...o });
  const max = Math.max(1, ...dist.map((d) => d.count));

  return (
    <>
      <PageHeader title="Reseñas" description="Responder con amabilidad, incluso a las críticas, genera confianza en nuevos compradores." />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className="card h-fit p-5">
          <div className="flex items-end gap-2">
            <span className="text-4xl font-semibold tabular-nums tracking-tight">{summary.ratingCount ? Number(summary.ratingAvg).toFixed(1) : '—'}</span>
            <span className="pb-1 text-sm text-muted">de 5</span>
          </div>
          <Stars value={Number(summary.ratingAvg)} size={16} className="mt-1" />
          <p className="mt-1 text-xs text-muted">{summary.ratingCount} reseñas publicadas</p>
          <ul className="mt-4 space-y-1.5">
            {dist.map((d) => (
              <li key={d.rating}>
                <Link href={href({ calificacion: d.rating, pagina: 1 })} className="flex items-center gap-2 text-xs hover:text-ink">
                  <span className="w-3 tabular-nums text-muted">{d.rating}</span><Star className="size-3 fill-star text-star" />
                  <span className="h-1.5 flex-1 rounded-full bg-subtle"><span className="block h-full rounded-full bg-star" style={{ width: `${(d.count / max) * 100}%` }} /></span>
                  <span className="w-6 text-right tabular-nums text-muted">{d.count}</span>
                </Link>
              </li>
            ))}
          </ul>
          {pending > 0 && <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{pending} sin responder</p>}
        </aside>

        <div>
          <FilterTabs items={[
            { label: 'Todas', href: href({ calificacion: '', sin_responder: '' }), active: !r && !unanswered },
            { label: 'Sin responder', href: href({ calificacion: '', sin_responder: '1' }), active: unanswered && !r, count: pending },
            ...[5, 4, 3, 2, 1].map((n) => ({ label: `${n} ★`, href: href({ calificacion: n, sin_responder: '' }), active: r === n && !unanswered })),
          ]} />
          {items.length ? (
            <ul className="space-y-3">
              {items.map((rv) => (
                <li key={rv.id} className="card p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                    <Stars value={rv.rating} />
                    <span className="font-medium text-ink">{rv.buyerName.split(' ')[0]}</span>
                    <span>{formatDate(rv.createdAt)}</span>
                    {rv.verified && <Badge tone="success"><BadgeCheck className="size-3" />Compra verificada</Badge>}
                    {rv.status === 'hidden' && <Badge tone="danger">Oculta por moderación</Badge>}
                  </div>
                  <Link href={`/vendedor/productos/${rv.productId}/vista-previa`} className="mt-2 block text-xs text-muted hover:text-ink">{rv.productTitle}</Link>
                  {rv.title && <p className="mt-2 font-medium">{rv.title}</p>}
                  <p className="mt-1 whitespace-pre-line text-sm text-ink-2">{rv.body}</p>
                  {rv.response && (
                    <div className="mt-3 rounded-lg bg-subtle px-3 py-2 text-sm">
                      <p className="text-xs font-medium text-muted">Tu respuesta · {formatDate(rv.respondedAt!)}</p>
                      <p className="mt-1 whitespace-pre-line">{rv.response}</p>
                    </div>
                  )}
                  <details className="group mt-3" open={!rv.response}>
                    <summary className="text-sm font-medium text-ink-2 hover:text-ink">{rv.response ? 'Editar respuesta' : 'Responder'}</summary>
                    <ActionForm action={respondReviewAction.bind(null, rv.id)} className="mt-2 space-y-2">
                      <Textarea name="body" required minLength={2} maxLength={2000} rows={3} defaultValue={rv.response ?? ''} aria-label="Respuesta pública" placeholder="Gracias por tu compra…" />
                      <SubmitButton size="sm">Publicar respuesta</SubmitButton>
                    </ActionForm>
                  </details>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={<MessageSquare className="size-5" />} title={r || unanswered ? 'Sin reseñas con este filtro' : 'Aún no tienes reseñas'}>
              {r || unanswered ? '¡Vas al día!' : 'Los compradores pueden reseñar cuando reciben su pedido.'}
            </EmptyState>
          )}
          <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={(n) => href({ pagina: n })} />
        </div>
      </div>
    </>
  );
}
