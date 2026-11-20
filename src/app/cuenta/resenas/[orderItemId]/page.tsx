import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BadgeCheck } from 'lucide-react';
import { requireUser } from '@/lib/auth/guards';
import { reviewTarget } from '@/lib/services/account';
import { createReviewAction } from '@/actions/shop';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Field, Input, Textarea } from '@/components/ui/form';
import { StarInput } from '@/components/community/star-input';
import { BackLink } from '@/components/dashboard-shell';
import { LIMITS } from '@/lib/config';

export const metadata: Metadata = { title: 'Calificar producto' };

export default async function WriteReview(props: PageProps<'/cuenta/resenas/[orderItemId]'>) {
  const user = await requireUser('/cuenta/pedidos');
  const { orderItemId } = await props.params;
  const t = await reviewTarget(user.id, orderItemId);
  if (!t) notFound();
  return (
    <div className="max-w-2xl">
      <BackLink href="/cuenta/pedidos">Mis compras</BackLink>
      <h1 className="text-2xl font-semibold">Califica tu compra</h1>
      <div className="card mt-5 flex items-center gap-4 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={t.item.imageUrl ?? ''} alt="" className="size-16 rounded-lg bg-subtle object-cover" />
        <div className="text-sm"><div className="font-medium">{t.item.title}</div>{t.item.variantName !== 'Único' && <div className="text-muted">{t.item.variantName}</div>}</div>
      </div>
      {t.already ? (
        <p className="mt-6 rounded-xl bg-subtle p-4 text-sm">Ya publicaste una reseña de este producto. {t.slug && <Link href={`/producto/${t.slug}#resenas`} className="link">Verla</Link>}</p>
      ) : t.status !== 'delivered' ? (
        <p className="mt-6 rounded-xl bg-subtle p-4 text-sm">Podrás calificar este producto cuando confirmes que lo recibiste.</p>
      ) : (
        <ActionForm action={createReviewAction.bind(null, orderItemId)} className="card mt-5 space-y-5 p-5 sm:p-6">
          <Field label="Tu calificación"><StarInput name="rating" /></Field>
          <Field label="Título (opcional)" htmlFor="title"><Input id="title" name="title" maxLength={120} placeholder="Resume tu experiencia" /></Field>
          <Field label="Tu opinión" htmlFor="body" hint="Entre 10 y 3000 caracteres. Cuenta qué te gustó, qué no y cómo lo usas."><Textarea id="body" name="body" required minLength={10} maxLength={3000} rows={6} /></Field>
          <Field label={`Fotos (opcional, hasta ${LIMITS.reviewImages})`} htmlFor="images" hint="JPG, PNG o WEBP de hasta 8 MB. Quitamos los datos de ubicación de tus fotos.">
            <input id="images" name="images" type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-subtle file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-line" />
          </Field>
          <p className="flex items-center gap-2 text-xs text-muted"><BadgeCheck className="size-4 text-success" />Tu reseña se mostrará como compra verificada. Debe cumplir las normas de la comunidad.</p>
          <SubmitButton size="lg" pendingText="Publicando…">Publicar reseña</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
