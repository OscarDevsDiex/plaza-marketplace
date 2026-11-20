import Link from 'next/link';
import { Package, Heart, Store, MailWarning, CheckCircle2, ArrowRight } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { listBuyerOrders, favoriteProductIds, followedStores } from '@/lib/services/account';
import { resendVerificationAction } from '@/actions/auth';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { ButtonLink } from '@/components/ui/button';
import { PageHeader, Stat } from '@/components/ui/misc';
import { StatusBadge } from '@/components/order-status';
import { formatDate, formatMoney, orderNumber } from '@/lib/utils';
import { needsEmailCheck } from '@/lib/config';

export default async function AccountHome(props: PageProps<'/cuenta'>) {
  const user = await requireUser('/cuenta');
  const sp = await props.searchParams;
  const [orders, favs, follows] = await Promise.all([listBuyerOrders(user.id, 5), favoriteProductIds(user.id), followedStores(user.id)]);
  const notice = sp.correo === 'verificado' ? ['ok', '¡Listo! Tu correo quedó confirmado.'] : sp.correo === 'invalido' ? ['error', 'El enlace de verificación no es válido o ya venció. Solicita uno nuevo abajo.'] : sp.contrasena === 'actualizada' ? ['ok', 'Tu contraseña se actualizó.'] : sp.bienvenida ? ['ok', `¡Bienvenido a Plaza, ${user.name.split(' ')[0]}! Te enviamos un correo para confirmar tu cuenta.`] : null;

  return (
    <>
      <PageHeader title={`Hola, ${user.name.split(' ')[0]}`} description={user.email} />
      {notice && <div className={`mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${notice[0] === 'ok' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}><CheckCircle2 className="size-4" />{notice[1]}</div>}
      {needsEmailCheck(user) && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/20 bg-warning-soft px-4 py-3 text-sm text-warning">
          <span className="flex items-center gap-2"><MailWarning className="size-4" />Confirma tu correo para poder comprar y vender.</span>
          <ActionForm action={resendVerificationAction}><SubmitButton size="sm" variant="secondary">Reenviar enlace</SubmitButton></ActionForm>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/cuenta/pedidos"><Stat label="Compras" value={orders.length >= 5 ? '5+' : orders.length} icon={<Package className="size-4" />} hint="Ver historial" /></Link>
        <Link href="/cuenta/favoritos"><Stat label="Favoritos" value={favs.length} icon={<Heart className="size-4" />} hint="Productos guardados" /></Link>
        <Link href="/cuenta/siguiendo"><Stat label="Tiendas que sigues" value={follows.length} icon={<Store className="size-4" />} hint="Novedades de tus tiendas" /></Link>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Compras recientes</h2><Link href="/cuenta/pedidos" className="text-sm text-muted hover:text-ink">Ver todas</Link></div>
        {orders.length === 0 ? (
          <div className="card p-6 text-sm text-muted">Aún no tienes compras. <Link href="/" className="link">Descubre productos</Link></div>
        ) : (
          <ul className="card divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/cuenta/pedidos/${o.id}`} className="flex items-center gap-4 p-4 transition-colors hover:bg-subtle/60">
                  <div className="flex -space-x-3">
                    {o.sellerOrders.flatMap((s) => s.items).slice(0, 3).map((i) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i.id} src={i.imageUrl ?? ''} alt="" className="size-11 rounded-lg bg-subtle object-cover ring-2 ring-surface" />
                    ))}
                  </div>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium">{orderNumber(o.number)}</div><div className="text-xs text-muted">{formatDate(o.createdAt)} · {formatMoney(o.total)}</div></div>
                  <StatusBadge status={o.status} />
                  <ArrowRight className="size-4 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {!user.store && (
        <section className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-6">
          <div><h2 className="font-semibold">¿Tienes algo que vender?</h2><p className="mt-1 text-sm text-muted">Abre tu tienda con esta misma cuenta, sin mensualidades.</p></div>
          <ButtonLink href="/vender">Abrir mi tienda</ButtonLink>
        </section>
      )}
    </>
  );
}
