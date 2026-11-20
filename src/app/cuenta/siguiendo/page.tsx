import type { Metadata } from 'next';
import Link from 'next/link';
import { Store } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { followedStores } from '@/lib/services/account';
import { toggleFollowAction } from '@/actions/shop';
import { FollowButton } from '@/components/community/toggles';
import { EmptyState, PageHeader, Stars } from '@/components/ui/misc';

export const metadata: Metadata = { title: 'Tiendas que sigo' };

export default async function FollowingPage() {
  const user = await requireUser('/cuenta/siguiendo');
  const stores = (await followedStores(user.id)).filter((s) => s.status === 'active');
  return (
    <>
      <PageHeader title="Tiendas que sigo" description="Te avisamos de las novedades de tus tiendas favoritas." />
      {stores.length === 0 ? (
        <EmptyState icon={<Store className="size-5" />} title="Aún no sigues tiendas">Visita una tienda y toca “Seguir tienda”.</EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {stores.map((s) => (
            <li key={s.id} className="card flex items-center gap-4 p-4">
              <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-subtle font-semibold">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {s.logoUrl ? <img src={s.logoUrl} alt="" className="size-full object-cover" /> : s.name[0]}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/tienda/${s.slug}`} className="font-medium hover:underline">{s.name}</Link>
                <div className="flex items-center gap-2 text-xs text-muted">{s.ratingCount > 0 && <><Stars value={Number(s.ratingAvg)} size={11} />{Number(s.ratingAvg).toFixed(1)}</>}{s.city && <span>{s.city}</span>}</div>
              </div>
              <FollowButton action={toggleFollowAction.bind(null, s.id, s.slug)} initial />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
