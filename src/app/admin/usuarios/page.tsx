import Link from 'next/link';
import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import { Users } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { PAGE_SIZE, likeTerm, one, oneOf, pageHref, pageOf, type SP } from '@/lib/services/admin';
import { Badge, EmptyState, PageHeader, Pagination } from '@/components/ui/misc';
import { DataTable, Filters, td, tr, linkClass } from '@/components/admin/ui';
import { ROLE_LABELS, StatusBadge, statusOptions } from '@/components/admin/status';
import { UserActions } from '@/components/admin/user-actions';
import { formatDate } from '@/lib/utils';

const { users, stores } = schema;
const ROLES = ['buyer', 'seller', 'admin'] as const;

export default async function AdminUsers({ searchParams }: { searchParams: Promise<SP> }) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q), role = oneOf(sp.rol, ROLES), status = oneOf(sp.estado, ['active', 'suspended'] as const), page = pageOf(sp);

  const conds: (SQL | undefined)[] = [
    q ? or(ilike(users.name, likeTerm(q)), ilike(users.email, likeTerm(q))) : undefined,
    status ? eq(users.status, status) : undefined,
    role ? sql`exists (select 1 from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = ${users.id} and r.key = ${role})` : undefined,
  ];
  const where = and(...conds);
  const [rows, [{ n: total }]] = await Promise.all([
    db.select({
      id: users.id, name: users.name, email: users.email, verified: users.emailVerifiedAt, status: users.status, createdAt: users.createdAt,
      roles: sql<string | null>`(select string_agg(r.key::text, ',' order by r.key) from user_roles ur join roles r on r.id = ur.role_id where ur.user_id = ${users.id})`,
      storeName: stores.name, storeSlug: stores.slug,
    }).from(users).leftJoin(stores, eq(stores.ownerId, users.id)).where(where)
      .orderBy(desc(users.createdAt)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ n: count() }).from(users).where(where),
  ]);

  return (
    <>
      <PageHeader title="Usuarios" description="Cuentas registradas, roles y accesos." />
      <Filters
        base="/admin/usuarios" q={q} placeholder="Buscar por nombre o correo" total={total}
        selects={[
          { name: 'rol', value: role, all: 'Todos los roles', options: ROLES.map((r) => [r, ROLE_LABELS[r]]) },
          { name: 'estado', value: status, all: 'Todos los estados', options: statusOptions('user') },
        ]}
      />
      {rows.length === 0 ? (
        <EmptyState icon={<Users className="size-5" />} title="Sin resultados">Prueba con otra búsqueda o quita los filtros.</EmptyState>
      ) : (
        <DataTable head={['Nombre', 'Correo', 'Verificado', 'Roles', 'Tienda', 'Estado', 'Registro', '']}>
          {rows.map((u) => {
            const roles = u.roles?.split(',') ?? [];
            return (
              <tr key={u.id} className={tr}>
                <td className={td}><Link href={`/admin/usuarios/${u.id}`} className={linkClass}>{u.name}</Link></td>
                <td className={`${td} text-ink-2`}>{u.email}</td>
                <td className={td}>{u.verified ? <Badge tone="success">Sí</Badge> : <Badge>No</Badge>}</td>
                <td className={td}><div className="flex flex-wrap gap-1">{roles.map((r) => <Badge key={r} tone={r === 'admin' ? 'dark' : 'neutral'}>{ROLE_LABELS[r] ?? r}</Badge>)}</div></td>
                <td className={td}>{u.storeSlug ? <Link href={`/admin/tiendas?q=${encodeURIComponent(u.storeName ?? '')}`} className="text-ink-2 hover:underline">{u.storeName}</Link> : <span className="text-faint">—</span>}</td>
                <td className={td}><StatusBadge kind="user" value={u.status} /></td>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDate(u.createdAt)}</td>
                <td className={td}><UserActions user={{ id: u.id, status: u.status, roles }} selfId={admin.id} /></td>
              </tr>
            );
          })}
        </DataTable>
      )}
      <Pagination page={page} total={total} pageSize={PAGE_SIZE} href={pageHref('/admin/usuarios', sp)} />
    </>
  );
}
