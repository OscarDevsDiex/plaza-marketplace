import { and, asc, eq, gte, inArray, isNull, sql } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { EARNING_STATUSES, money } from '@/lib/services/admin';
import { deleteCommissionAction, saveCommissionAction } from '@/actions/admin';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input, Select } from '@/components/ui/form';
import { EmptyState, PageHeader, Stat } from '@/components/ui/misc';
import { ConfirmAction, DataTable, Section, td, tr } from '@/components/admin/ui';
import { formatDateTime, formatMoney } from '@/lib/utils';

const { platformCommissions: pc, categories, sellerOrders } = schema;
const pct = (bps: number) => (bps / 100).toFixed(2);

export default async function AdminCommissions() {
  await requireAdmin();
  const earning = inArray(sellerOrders.status, [...EARNING_STATUSES]);
  const totals = (since?: boolean) => db.select({ fees: money(sql`sum(${sellerOrders.commissionAmount})`), gmv: money(sql`sum(${sellerOrders.total})`) })
    .from(sellerOrders).where(and(earning, since ? gte(sellerOrders.createdAt, sql`now() - interval '30 days'`) : undefined));
  const [[global], overrides, cats, [last30], [all]] = await Promise.all([
    db.select().from(pc).where(isNull(pc.categoryId)),
    db.select({ id: pc.id, rateBps: pc.rateBps, updatedAt: pc.updatedAt, categoryId: pc.categoryId, name: categories.name, parentId: categories.parentId })
      .from(pc).innerJoin(categories, eq(categories.id, pc.categoryId)).orderBy(asc(categories.name)),
    db.select({ id: categories.id, name: categories.name, parentId: categories.parentId }).from(categories).orderBy(asc(categories.position), asc(categories.name)),
    totals(true),
    totals(),
  ]);
  const catName = new Map(cats.map((c) => [c.id, c.name]));
  // Opciones en orden de árbol: principal y luego sus subcategorías.
  const catOptions = cats.filter((c) => c.parentId == null).flatMap((p) => [
    { id: p.id, label: p.name }, ...cats.filter((c) => c.parentId === p.id).map((c) => ({ id: c.id, label: `${p.name} › ${c.name}` })),
  ]);
  const globalBps = global?.rateBps ?? 1000;

  return (
    <>
      <PageHeader title="Comisiones" description="Porcentaje que retiene la plataforma de cada venta. Los cambios aplican solo a pedidos nuevos." />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Comisiones · 30 días" value={formatMoney(last30.fees)} />
        <Stat label="Ventas · 30 días" value={formatMoney(last30.gmv)} />
        <Stat label="Comisiones · histórico" value={formatMoney(all.fees)} />
        <Stat label="Ventas · histórico" value={formatMoney(all.gmv)} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Comisión global</h2>
          <p className="mb-4 text-xs text-muted">Se usa cuando la categoría (ni su categoría principal) tiene una excepción.{global ? ` Actualizada el ${formatDateTime(global.updatedAt)}.` : ' Aún no está guardada: se usa 10 % por defecto.'}</p>
          <ActionForm action={saveCommissionAction} className="flex items-end gap-2">
            <input type="hidden" name="categoryId" value="" />
            <Field label="Porcentaje" htmlFor="global-rate" className="w-36">
              <Input id="global-rate" name="rate" inputMode="decimal" defaultValue={pct(globalBps)} required pattern="\d{1,2}([.,]\d{1,2})?" />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </section>
        <section className="card p-5">
          <h2 className="text-sm font-semibold">Agregar o actualizar excepción</h2>
          <p className="mb-4 text-xs text-muted">Una excepción en una categoría principal también aplica a sus subcategorías.</p>
          <ActionForm action={saveCommissionAction} className="flex flex-wrap items-end gap-2">
            <Field label="Categoría" htmlFor="cat" className="min-w-48 flex-1">
              <Select id="cat" name="categoryId" required defaultValue="">
                <option value="" disabled>Elige una categoría</option>
                {catOptions.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
              </Select>
            </Field>
            <Field label="Porcentaje" htmlFor="cat-rate" className="w-28">
              <Input id="cat-rate" name="rate" inputMode="decimal" placeholder="12.50" required pattern="\d{1,2}([.,]\d{1,2})?" />
            </Field>
            <SubmitButton>Guardar</SubmitButton>
          </ActionForm>
        </section>
      </div>

      <Section title="Excepciones por categoría">
        {overrides.length === 0 ? (
          <EmptyState title="Sin excepciones">Todas las categorías usan la comisión global de {pct(globalBps)} %.</EmptyState>
        ) : (
          <DataTable head={['Categoría', 'Comisión', 'Actualizada', '']}>
            {overrides.map((o) => (
              <tr key={o.id} className={tr}>
                <td className={td}>{o.parentId != null ? <span className="text-muted">{catName.get(o.parentId)} › </span> : null}{o.name}</td>
                <td className={`${td} tabular-nums font-medium`}>{pct(o.rateBps)} %</td>
                <td className={`${td} whitespace-nowrap text-muted`}>{formatDateTime(o.updatedAt)}</td>
                <td className={td}>
                  <div className="flex justify-end">
                    <ConfirmAction action={deleteCommissionAction.bind(null, o.id)} label="Eliminar" confirm={`Volver a la comisión global (${pct(globalBps)} %)`} />
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Section>
    </>
  );
}
