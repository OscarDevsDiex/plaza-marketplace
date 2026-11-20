import { ExternalLink } from 'lucide-react';
import { requireSeller } from '@/lib/auth/guards';
import { getStoreSettings } from '@/lib/services/seller/queries';
import { updateStoreAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { ButtonLink } from '@/components/ui/button';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { PageHeader } from '@/components/ui/misc';
import { Card, Thumb } from '@/components/seller/ui';
import { MX_STATES } from '@/components/seller/constants';

export const metadata = { title: 'Mi tienda' };

export default async function SellerStoreProfile() {
  const { user, store: s } = await requireSeller();
  const { store } = await getStoreSettings(s.id, user.id);
  const image = 'block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-line file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-subtle';

  return (
    <>
      <PageHeader title="Mi tienda" description="Así te presentas ante los compradores."
        actions={<ButtonLink href={`/tienda/${store.slug}`} variant="secondary"><ExternalLink className="size-4" />Ver página pública</ButtonLink>} />
      <ActionForm action={updateStoreAction} className="grid max-w-4xl gap-4 lg:grid-cols-[1fr_300px]">
        <Card title="Perfil">
          <div className="space-y-4">
            <Field label="Nombre de la tienda" htmlFor="name" hint={`Tu dirección pública no cambia: /tienda/${store.slug}`}>
              <Input id="name" name="name" required minLength={3} maxLength={60} defaultValue={store.name} />
            </Field>
            <Field label="Descripción" htmlFor="description" hint="Qué vendes y por qué comprarte. Máximo 1,000 caracteres.">
              <Textarea id="description" name="description" rows={5} maxLength={1000} defaultValue={store.description} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Ciudad" htmlFor="city"><Input id="city" name="city" maxLength={80} defaultValue={store.city ?? ''} /></Field>
              <Field label="Estado" htmlFor="state">
                <Select id="state" name="state" defaultValue={store.state ?? ''}>
                  <option value="">Sin especificar</option>
                  {MX_STATES.map((st) => <option key={st}>{st}</option>)}
                  {store.state && !MX_STATES.includes(store.state) && <option>{store.state}</option>}
                </Select>
              </Field>
            </div>
          </div>
        </Card>
        <Card title="Imágenes">
          <div className="space-y-5">
            <Field label="Logo" htmlFor="logo" hint="Cuadrado, mínimo 200 × 200 px.">
              <div className="flex items-center gap-3">
                <Thumb src={store.logoUrl} size={56} className="rounded-full" />
                <input id="logo" name="logo" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={image} />
              </div>
            </Field>
            <Field label="Portada" htmlFor="banner" hint="Horizontal, se recomienda 1600 × 400 px.">
              {store.bannerUrl && (
                // eslint-disable-next-line @next/next/no-img-element -- imagen ya optimizada al subirla
                <img src={store.bannerUrl} alt="" className="mb-2 aspect-[4/1] w-full rounded-lg border border-line object-cover" />
              )}
              <input id="banner" name="banner" type="file" accept="image/jpeg,image/png,image/webp,image/avif" className={image} />
            </Field>
          </div>
        </Card>
        <div className="lg:col-span-2"><SubmitButton pendingText="Guardando…">Guardar cambios</SubmitButton></div>
      </ActionForm>
    </>
  );
}
