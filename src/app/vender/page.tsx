import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Store, Percent, ShieldCheck, BarChart3, Star, Truck } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { getCommissionInfo } from '@/lib/services/seller/queries';
import { createStoreAction } from '@/actions/seller';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { ButtonLink } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { MX_STATES } from '@/components/seller/constants';
import { APP_NAME, needsEmailCheck } from '@/lib/config';

export const metadata: Metadata = {
  title: 'Vende en línea',
  description: `Abre tu tienda gratis en ${APP_NAME}: sin mensualidades, solo una comisión cuando vendes.`,
  alternates: { canonical: '/vender' },
};

const pct = (bps: number) => `${(bps / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} %`;

export default async function SellPage() {
  const user = await getCurrentUser();
  if (user?.store) redirect('/vendedor');
  const { global, exceptions } = await getCommissionInfo();

  return (
    <main className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
        <section>
          <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand"><Store className="size-4" />Vende en {APP_NAME}</span>
          <h1 className="mt-3 text-4xl leading-tight font-semibold">Abre tu tienda gratis y vende a todo México.</h1>
          <p className="mt-4 text-lg text-muted">Sin mensualidades ni costos de alta. Publica tus productos, recibe pedidos pagados y envíalos con la paquetería que prefieras.</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              [Percent, 'Solo pagas al vender', global != null ? `Comisión de ${pct(global)} sobre el valor de cada venta (el envío no paga comisión).` : 'Una comisión por cada venta; el envío no paga comisión.'],
              [ShieldCheck, 'Cobros seguros', 'Los compradores pagan con Stripe o Mercado Pago antes de que envíes.'],
              [BarChart3, 'Panel profesional', 'Pedidos, inventario, cupones y estadísticas en un solo lugar.'],
              [Star, 'Reseñas verificadas', 'Solo opinan quienes compraron y recibieron tu producto.'],
              [Truck, 'Tú controlas el envío', 'Define tu costo, envío gratis y días de preparación.'],
              [Store, 'Tu propia página', 'Una tienda pública con tu logo, portada y productos.'],
            ].map(([Icon, t, d]) => {
              const I = Icon as typeof Store;
              return (
                <li key={t as string} className="flex gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-subtle"><I className="size-4" /></span>
                  <div><div className="text-sm font-medium">{t as string}</div><div className="text-[13px] text-muted">{d as string}</div></div>
                </li>
              );
            })}
          </ul>
          {exceptions.length > 0 && (
            <p className="mt-6 text-xs text-muted">Comisiones especiales: {exceptions.map((e) => `${e.category} ${pct(e.rateBps)}`).join(' · ')}. <Link href="/ayuda/comisiones" className="link">Detalles</Link></p>
          )}
        </section>

        <section className="card self-start p-6 sm:p-7">
          {!user ? (
            <div className="text-center">
              <h2 className="text-xl font-semibold">Empieza en 2 minutos</h2>
              <p className="mt-2 text-sm text-muted">Usa tu cuenta de comprador o crea una nueva. Con la misma cuenta compras y vendes.</p>
              <div className="mt-6 grid gap-3">
                <ButtonLink href="/registro?next=/vender" size="lg">Crear cuenta gratis</ButtonLink>
                <ButtonLink href="/entrar?next=/vender" variant="secondary" size="lg">Ya tengo cuenta</ButtonLink>
              </div>
            </div>
          ) : needsEmailCheck(user) ? (
            <div>
              <h2 className="text-xl font-semibold">Confirma tu correo primero</h2>
              <p className="mt-2 text-sm text-muted">Para abrir una tienda necesitamos verificar {user.email}. Revisa tu bandeja de entrada o reenvía el enlace desde <Link href="/cuenta" className="link">tu cuenta</Link>.</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Crea tu tienda</h2>
              <p className="mt-1 text-sm text-muted">Podrás cambiar estos datos después.</p>
              <ActionForm action={createStoreAction} className="mt-6 space-y-4">
                <Field label="Nombre de la tienda" htmlFor="name" hint="Será tu dirección pública: /tienda/nombre-de-tu-tienda"><Input id="name" name="name" required minLength={3} maxLength={60} autoFocus /></Field>
                <Field label="¿Qué vendes?" htmlFor="description"><Textarea id="description" name="description" rows={3} maxLength={1000} placeholder="Describe tu tienda en pocas palabras" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ciudad" htmlFor="city"><Input id="city" name="city" maxLength={80} /></Field>
                  <Field label="Estado" htmlFor="state"><Select id="state" name="state" defaultValue=""><option value="">Elige</option>{MX_STATES.map((s) => <option key={s}>{s}</option>)}</Select></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nombre o razón social" htmlFor="legalName"><Input id="legalName" name="legalName" required minLength={3} maxLength={150} defaultValue={user.name} /></Field>
                  <Field label="Teléfono" htmlFor="phone"><Input id="phone" name="phone" required inputMode="tel" placeholder="10 dígitos" /></Field>
                </div>
                <Checkbox name="terms" required label={<>Acepto los <Link href="/legal/vendedores" className="link" target="_blank">términos para vendedores</Link> y las comisiones vigentes.</>} />
                <SubmitButton size="lg" className="w-full" pendingText="Creando tu tienda…">Abrir mi tienda</SubmitButton>
              </ActionForm>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
