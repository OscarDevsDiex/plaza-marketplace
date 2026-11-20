import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/catalog-view';

export async function generateMetadata(props: PageProps<'/buscar'>): Promise<Metadata> {
  const { q } = await props.searchParams;
  const term = typeof q === 'string' ? q.slice(0, 60) : '';
  return {
    title: term ? `Resultados para “${term}”` : 'Todos los productos',
    robots: term ? { index: false, follow: true } : undefined, // las búsquedas libres no se indexan (contenido duplicado)
    alternates: { canonical: '/buscar' },
  };
}

export default async function SearchPage(props: PageProps<'/buscar'>) {
  const raw = await props.searchParams;
  const q = typeof raw.q === 'string' ? raw.q.trim() : '';
  return <CatalogView base="/buscar" raw={raw} heading={q ? `Resultados para “${q.slice(0, 60)}”` : 'Todos los productos'} />;
}
