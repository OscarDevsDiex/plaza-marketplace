import { requireSeller } from '@/lib/auth/guards';
import { getStoreSettings } from '@/lib/services/seller/queries';
import { updateShippingAction, updateSellerProfileAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/misc';
import { Card } from '@/components/seller/ui';
import { centsToInput } from '@/lib/utils';

export const metadata = { title: 'Configuración' };

export default async function SellerSettings() {
  const { user, store: s } = await requireSeller();
  const { store, profile } = await getStoreSettings(s.id, user.id);
  return (
    <>
      <PageHeader title="Configuración" description="Envíos y datos de contacto de tu negocio." />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
        <Card title="Envíos">
          <ActionForm action={updateShippingAction} className="space-y-4">
            <Field label="Costo de envío por pedido (MXN)" htmlFor="shippingFlat" hint="Se cobra una vez por pedido de tu tienda, sin importar cuántos productos lleve.">
              <Input id="shippingFlat" name="shippingFlat" inputMode="decimal" required defaultValue={centsToInput(store.shippingFlat)} />
            </Field>
            <Field label="Envío gratis desde (MXN)" htmlFor="freeShippingOver" hint="Déjalo vacío si nunca ofreces envío gratis.">
              <Input id="freeShippingOver" name="freeShippingOver" inputMode="decimal" defaultValue={centsToInput(store.freeShippingOver)} placeholder="Ej. 799" />
            </Field>
            <Field label="Días hábiles para preparar el pedido" htmlFor="processingDays" hint="Se muestra en cada producto. De 1 a 15.">
              <Input id="processingDays" name="processingDays" type="number" min={1} max={15} required defaultValue={store.processingDays} className="w-28" />
            </Field>
            <SubmitButton pendingText="Guardando…">Guardar envíos</SubmitButton>
          </ActionForm>
        </Card>
        <Card title="Datos del vendedor">
          <ActionForm action={updateSellerProfileAction} className="space-y-4">
            <Field label="Nombre o razón social" htmlFor="legalName"><Input id="legalName" name="legalName" required minLength={3} maxLength={150} defaultValue={profile?.legalName ?? ''} /></Field>
            <Field label="Teléfono de contacto" htmlFor="phone" hint="Solo lo ve el equipo de Plaza."><Input id="phone" name="phone" required inputMode="tel" defaultValue={profile?.phone ?? ''} /></Field>
            <Field label="RFC (opcional)" htmlFor="taxId" hint="Lo necesitaremos antes de liberar tus ventas cuando se habiliten las liquidaciones.">
              <Input id="taxId" name="taxId" maxLength={13} className="uppercase" defaultValue={profile?.taxId ?? ''} placeholder="GODE561231GR8" />
            </Field>
            <SubmitButton pendingText="Guardando…">Guardar datos</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </>
  );
}
