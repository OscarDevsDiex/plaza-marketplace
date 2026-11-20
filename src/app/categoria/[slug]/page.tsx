import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CatalogView } from '@/components/catalog/catalog-view';
import { getCategoryBySlug } from '@/lib/services/catalog';

export async function generateMetadata(props: PageProps<'/categoria/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const c = await getCategoryBySlug(slug);
  if (!c) return {};
  return {
    title: c.name,
    description: `Compra ${c.name.toLowerCase()} de tiendas independientes con envío a todo México, compra protegida y reseñas verificadas.`,
    alternates: { canonical: `/categoria/${c.slug}` },
  };
}

export default async function CategoryPage(props: PageProps<'/categoria/[slug]'>) {
  const [{ slug }, raw] = await Promise.all([props.params, props.searchParams]);
  const c = await getCategoryBySlug(slug);
  if (!c) notFound();
  return <CatalogView base={`/categoria/${c.slug}`} raw={raw} category={c} heading={c.name} />;
}
