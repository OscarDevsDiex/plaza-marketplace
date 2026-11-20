import Link from 'next/link';
import { notFound } from 'next/navigation';
import { and, count, desc, eq, inArray, or, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { isUuid, money } from '@/lib/services/admin';
import { BackLink } from '@/components/dashboard-shell';
import { Badge, PageHeader, Stat } from '@/components/ui/misc';
import { DataTable, PublicLink, Section, td, tr } from '@/components/admin/ui';
import { ROLE_LABELS, StatusBadge } from '@/components/admin/status';
import { UserActions } from '@/components/admin/user-actions';
import { formatDate, formatDateTime, formatMoney, orderNumber } from '@/lib/utils';

const { users, userRoles, roles, stores, orders, auditLogs } = schema;

export default async function AdminUserDetail({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [user] = await db.select().from(users).where(eq(users.id, id));
  if (!user) notFound();

  const [roleRows, [store], [ordersStats], recentOrders, logs] = await Promise.all([
    db.select({ key: roles.key }).from(userRoles).innerJoin(roles, eq(roles.id, userRoles.roleId)).where(eq(userRoles.userId, id)),
    db.select({ id: stores.id, name: stores.name, slug: stores.slug, status: stores.status }).from(stores).where(eq(stores.ownerId, id)),
    db.select({ n: count(), spent: money(sql`sum(${orders.total}) filter (where ${inArray(orders.status, ['paid', 'completed'])})`) }).from(orders).where(eq(orders.buyerId, id)),
    db.select({ id: orders.id, number: orders.number, status: orders.status, total: orders.total, createdAt: orders.createdAt })
      .from(orders).where(eq(orders.buyerId, id)).orderBy(desc(orders.createdAt)).limit(5),
    db.select().from(auditLogs).where(or(eq(auditLogs.actorId, id), and(eq(auditLogs.entityType, 'user'), eq(auditLogs.entityId, id))))
      .orderBy(desc(auditLogs.createdAt)).limit(20),
  ]);
  const roleKeys = roleRows.map((r) => r.key);

  return (
    <>
      <BackLink href="/admin/usuarios">Usuarios</BackLink>
      <PageHeader
        title={<span className="flex flex-wrap items-center gap-2">{user.name} <StatusBadge kind="user" value={user.status} /></span>}
        description={user.email}
        actions={<UserActions user={{ id: user.id, status: user.status, roles: roleKeys }} selfId={admin.id} />}
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Pedidos" value={ordersStats.n.toLocaleString('es-MX')} />
        <Stat label="Compras pagadas" value={formatMoney(ordersStats.spent)} />
        <Stat label="Correo verificado" value={user.emailVerifiedAt ? 'Sí' : 'No'} hint={user.emailVerifiedAt ? formatDate(user.emailVerifiedAt) : undefined} />
        <Stat label="Registro" value={formatDate(user.createdAt)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Roles</h2>
          <div className="flex flex-wrap gap-1.5">{roleKeys.map((r) => <Badge key={r} tone={r === 'admin' ? 'dark' : 'neutral'}>{ROLE_LABELS[r]}</Badge>)}</div>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Tienda</h2>
          {store ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <Link href={`/admin/tiendas?q=${encodeURIComponent(store.name)}`} className="font-medium hover:underline">{store.name}</Link>
              <StatusBadge kind="store" value={store.status} />
              <PublicLink href={`/tienda/${store.slug}`}>Ver tienda</PublicLink>
            </div>
          ) : <p className="text-sm text-muted">No tiene tienda.</p>}
        </div>
      </div>

      <Section title="Pedidos recientes" actions={ordersStats.n > 5 ? <Link href={`/admin/pedidos?q=${encodeURIComponent(user.email)}`} className="text-sm text-muted hover:text-ink">Ver todos</Link> : undefined}>
        {recentOrders.length ? (
          <DataTable head={['Pedido', 'Estado', 'Total', 'Fecha']}>
            {recentOrders.map((o) => (
              <tr key={o.id} className={tr}>
                <td className={td}><Link href={`/admin/pedidos/${o.id}`} className="font-medium tabular-nums hover:underline">{orderNumber(o.number)}</Link></td>
                <td className={td}><StatusBadge kind="order" value={o.status} /></td>
                <td className={`${td} tabular-nums`}>{formatMoney(o.total)}</td>
                <td className={`${td} text-muted`}>{formatDateTime(o.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : <p className="text-sm text-muted">Sin pedidos.</p>}
      </Section>

      <Section title="Actividad reciente" description="Acciones hechas por esta persona o sobre su cuenta.">
        {logs.length ? (
          <DataTable head={['Acción', 'Entidad', 'Detalles', 'Fecha']}>
            {logs.map((l) => (
              <tr key={l.id} className={tr}>
                <td className={`${td} font-mono text-xs`}>{l.action}</td>
                <td className={`${td} text-xs text-muted`}>{l.entityType}{l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ''}</td>
                <td className={`${td} max-w-xs truncate font-mono text-xs text-muted`} title={l.metadata ? JSON.stringify(l.metadata) : undefined}>{l.metadata ? JSON.stringify(l.metadata) : '—'}</td>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(l.createdAt)}</td>
              </tr>
            ))}
          </DataTable>
        ) : <p className="text-sm text-muted">Sin actividad registrada.</p>}
      </Section>
    </>
  );
}
