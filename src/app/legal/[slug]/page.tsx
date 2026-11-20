import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LEGAL } from '@/content/pages';
import { ContentPage } from '@/components/content-page';

const LINKS: [string, string][] = [['/legal/terminos', 'Términos y condiciones'], ['/legal/privacidad', 'Aviso de privacidad'], ['/legal/vendedores', 'Términos para vendedores']];

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata(props: PageProps<'/legal/[slug]'>): Promise<Metadata> {
  const page = LEGAL[(await props.params).slug];
  return page ? { title: page.title, description: page.description } : {};
}

export default async function LegalPage(props: PageProps<'/legal/[slug]'>) {
  const { slug } = await props.params;
  if (!Object.hasOwn(LEGAL, slug)) notFound();
  const page = LEGAL[slug];
  return <ContentPage section="Legal" title={page.title} links={LINKS}>{page.body}</ContentPage>;
}
