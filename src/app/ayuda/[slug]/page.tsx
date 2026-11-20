import type { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { HELP } from '@/content/pages';
import { ContentPage } from '@/components/content-page';
import { getCommissionInfo } from '@/lib/services/seller/queries';
import { requestData } from '@/lib/db';

const LINKS: [string, string][] = [['/ayuda/compra-protegida', 'Compra protegida'], ['/ayuda/envios', 'Envíos'], ['/ayuda/devoluciones', 'Devoluciones'], ['/ayuda/comisiones', 'Comisiones para vendedores']];

export function generateStaticParams() {
  return [...Object.keys(HELP), 'comisiones'].map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<'/ayuda/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  if (slug === 'comisiones') return { title: 'Comisiones para vendedores', alternates: { canonical: '/ayuda/comisiones' } };
  const page = HELP[slug];
  return page ? { title: page.title, description: page.description, alternates: { canonical: `/ayuda/${slug}` } } : {};
}

export default async function HelpPage(props: PageProps<'/ayuda/[slug]'>) {
  const { slug } = await props.params;
  if (slug === 'comisiones') {
    return (
      <ContentPage section="Ayuda" title="Comisiones para vendedores" links={LINKS}>
        <p>Abrir tu tienda y publicar productos es gratis. Solo cobramos una comisión cuando vendes, calculada sobre el valor de los productos después de descuentos. El costo de envío no paga comisión.</p>
        <Suspense fallback={<div className="skeleton mt-4 h-24" />}><Rates /></Suspense>
        <h2>Cuándo recibes tu dinero</h2>
        <p>El monto de cada venta, menos la comisión, queda retenido hasta que el comprador recibe el pedido. Las liquidaciones a tu cuenta se habilitan al completar tu RFC y la verificación de identidad.</p>
      </ContentPage>
    );
  }
  if (!Object.hasOwn(HELP, slug)) notFound();
  const page = HELP[slug];
  return <ContentPage section="Ayuda" title={page.title} links={LINKS}>{page.body}</ContentPage>;
}

async function Rates() {
  await requestData();
  const { global, exceptions } = await getCommissionInfo();
  const pct = (bps: number) => `${(bps / 100).toLocaleString('es-MX', { maximumFractionDigits: 2 })} %`;
  return (
    <table className="mt-5 w-full overflow-hidden rounded-xl border border-line text-sm">
      <tbody className="divide-y divide-line">
        <tr><td className="px-4 py-2.5">Todas las categorías</td><td className="px-4 py-2.5 text-right font-medium">{global != null ? pct(global) : '—'}</td></tr>
        {exceptions.map((e) => <tr key={e.categoryId}><td className="px-4 py-2.5">{e.category}</td><td className="px-4 py-2.5 text-right font-medium">{pct(e.rateBps)}</td></tr>)}
      </tbody>
    </table>
  );
}
