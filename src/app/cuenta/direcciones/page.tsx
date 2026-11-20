import type { Metadata } from 'next';
import { desc, eq } from 'drizzle-orm';
import { MapPin } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { db, schema } from '@/lib/db';
import { addAddressAction, deleteAddressAction, defaultAddressAction } from '@/actions/account';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input, Select } from '@/components/ui/form';
import { Badge, PageHeader } from '@/components/ui/misc';
import { MX_STATES } from '@/components/checkout/address-fields';

export const metadata: Metadata = { title: 'Direcciones' };

export default async function AddressesPage() {
  const user = await requireUser('/cuenta/direcciones');
  const list = await db.select().from(schema.addresses).where(eq(schema.addresses.userId, user.id)).orderBy(desc(schema.addresses.isDefault), desc(schema.addresses.createdAt));
  return (
    <>
      <PageHeader title="Direcciones" description="Elige una al pagar para no escribirla cada vez." />
      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <ul className="space-y-3">
          {list.length === 0 && <li className="card p-6 text-sm text-muted">No tienes direcciones guardadas.</li>}
          {list.map((a) => (
            <li key={a.id} className="card flex flex-wrap items-start justify-between gap-4 p-5">
              <div className="flex gap-3 text-sm">
                <MapPin className="mt-0.5 size-4 text-muted" />
                <div>
                  <div className="flex items-center gap-2 font-medium">{a.recipientName} {a.isDefault && <Badge tone="dark">Principal</Badge>}</div>
                  <div className="mt-1 text-muted">{a.street} {a.extNumber}{a.intNumber ? ` int. ${a.intNumber}` : ''}, {a.neighborhood}<br />{a.city}, {a.state}, C.P. {a.postalCode} · Tel. {a.phone}</div>
                </div>
              </div>
              <div className="flex gap-2">
                {!a.isDefault && <form action={defaultAddressAction.bind(null, a.id)}><SubmitButton variant="secondary" size="sm">Hacer principal</SubmitButton></form>}
                <form action={deleteAddressAction.bind(null, a.id)}><SubmitButton variant="danger" size="sm">Eliminar</SubmitButton></form>
              </div>
            </li>
          ))}
        </ul>
        <ActionForm action={addAddressAction} resetOnSuccess className="card space-y-4 self-start p-5">
          <h2 className="font-semibold">Agregar dirección</h2>
          <Field label="Nombre de quien recibe" htmlFor="recipientName"><Input id="recipientName" name="recipientName" required defaultValue={user.name} /></Field>
          <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" required inputMode="tel" /></Field>
          <Field label="Calle" htmlFor="street"><Input id="street" name="street" required /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Núm. ext." htmlFor="extNumber"><Input id="extNumber" name="extNumber" required /></Field><Field label="Núm. int." htmlFor="intNumber"><Input id="intNumber" name="intNumber" /></Field></div>
          <div className="grid grid-cols-2 gap-3"><Field label="Colonia" htmlFor="neighborhood"><Input id="neighborhood" name="neighborhood" required /></Field><Field label="C.P." htmlFor="postalCode"><Input id="postalCode" name="postalCode" required inputMode="numeric" maxLength={5} /></Field></div>
          <Field label="Ciudad o municipio" htmlFor="city"><Input id="city" name="city" required /></Field>
          <Field label="Estado" htmlFor="state"><Select id="state" name="state" required defaultValue=""><option value="" disabled>Elige</option>{MX_STATES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
          <Field label="Referencias" htmlFor="references"><Input id="references" name="references" /></Field>
          <SubmitButton className="w-full">Guardar dirección</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
