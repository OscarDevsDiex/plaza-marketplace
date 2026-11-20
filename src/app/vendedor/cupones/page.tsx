import { TicketPercent, Trash2 } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { listCoupons } from '@/lib/services/seller/queries';
import { createCouponAction, deleteCouponAction, toggleCouponAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Badge, EmptyState, PageHeader } from '@/components/ui/misc';
import { Card, td, th } from '@/components/seller/ui';
import { cn, formatDate, formatMoney } from '@/lib/utils';

export const metadata = { title: 'Cupones' };

export default async function SellerCoupons() {
  const { store } = await requireSeller();
  const coupons = await listCoupons(store.id);
  const now = new Date();

  return (
    <>
      <PageHeader title="Cupones" description="Descuentos que tus compradores aplican en el carrito. Solo se aplican a productos de tu tienda." />
      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="order-2 xl:order-1">
          {coupons.length ? (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead><tr><th className={th}>Código</th><th className={th}>Descuento</th><th className={th}>Compra mínima</th><th className={th}>Usos</th><th className={th}>Vigencia</th><th className={th}>Estado</th><th className={th} /></tr></thead>
                <tbody>
                  {coupons.map((c) => {
                    const expired = !!c.endsAt && c.endsAt < now;
                    const exhausted = c.maxUses != null && c.uses >= c.maxUses;
                    const state = !c.active ? { l: 'Inactivo', t: 'neutral' as const } : expired ? { l: 'Vencido', t: 'danger' as const }
                      : exhausted ? { l: 'Agotado', t: 'warning' as const } : c.startsAt && c.startsAt > now ? { l: 'Programado', t: 'info' as const } : { l: 'Activo', t: 'success' as const };
                    return (
                      <tr key={c.id} className="border-t border-line hover:bg-subtle/60">
                        <td className={cn(td, 'font-mono font-medium')}>{c.code}</td>
                        <td className={cn(td, 'tabular-nums')}>{c.type === 'percent' ? `${c.value} %` : formatMoney(c.value)}</td>
                        <td className={cn(td, 'tabular-nums text-muted')}>{c.minSubtotal ? formatMoney(c.minSubtotal) : '—'}</td>
                        <td className={cn(td, 'tabular-nums')}>{c.uses}{c.maxUses != null && <span className="text-muted"> / {c.maxUses}</span>}</td>
                        <td className={cn(td, 'whitespace-nowrap text-muted')}>{c.startsAt || c.endsAt ? `${c.startsAt ? formatDate(c.startsAt) : 'Hoy'} – ${c.endsAt ? formatDate(c.endsAt) : 'sin fin'}` : 'Sin límite'}</td>
                        <td className={td}><Badge tone={state.t}>{state.l}</Badge></td>
                        <td className={td}>
                          <div className="flex justify-end gap-1">
                            <ActionForm action={toggleCouponAction.bind(null, c.id)} hideSuccess className="[&>p]:mt-1 [&>p]:text-xs">
                              <SubmitButton size="sm" variant="secondary">{c.active ? 'Desactivar' : 'Activar'}</SubmitButton>
                            </ActionForm>
                            <ActionForm action={deleteCouponAction.bind(null, c.id)} hideSuccess className="[&>p]:mt-1 [&>p]:text-xs">
                              <SubmitButton size="sm" variant="danger"><Trash2 className="size-3.5" /><span className="sr-only">Eliminar {c.code}</span></SubmitButton>
                            </ActionForm>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<TicketPercent className="size-5" />} title="Aún no tienes cupones">
              Crea un código como BIENVENIDA10 y compártelo en tus redes para atraer compradores.
            </EmptyState>
          )}
        </div>

        <Card title="Nuevo cupón" className="order-1 h-fit xl:order-2">
          <ActionForm action={createCouponAction} resetOnSuccess className="space-y-4">
            <Field label="Código" htmlFor="code" hint="De 3 a 20 letras o números, sin espacios.">
              <Input id="code" name="code" required minLength={3} maxLength={20} autoComplete="off" placeholder="BIENVENIDA10" className="font-mono uppercase" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tipo" htmlFor="type">
                <Select id="type" name="type" defaultValue="percent"><option value="percent">Porcentaje</option><option value="fixed">Monto fijo</option></Select>
              </Field>
              <Field label="Valor" htmlFor="value" hint="% (1–90) o pesos">
                <Input id="value" name="value" required inputMode="decimal" placeholder="10" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Compra mínima" htmlFor="minSubtotal"><Input id="minSubtotal" name="minSubtotal" inputMode="decimal" placeholder="$0" /></Field>
              <Field label="Usos máximos" htmlFor="maxUses"><Input id="maxUses" name="maxUses" type="number" min={1} step={1} placeholder="Sin límite" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inicia" htmlFor="startsAt"><Input id="startsAt" name="startsAt" type="date" /></Field>
              <Field label="Termina" htmlFor="endsAt"><Input id="endsAt" name="endsAt" type="date" /></Field>
            </div>
            <Checkbox name="active" defaultChecked label="Activar al crearlo" />
            <SubmitButton className="w-full">Crear cupón</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
