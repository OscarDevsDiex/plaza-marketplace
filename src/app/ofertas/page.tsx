import type { Metadata } from 'next';
import { CatalogView } from '@/components/catalog/catalog-view';

export const metadata: Metadata = {
  title: 'Ofertas',
  description: 'Descuentos reales de tiendas independientes: el precio anterior y el porcentaje de ahorro siempre visibles.',
  alternates: { canonical: '/ofertas' },
};

export default async function OffersPage(props: PageProps<'/ofertas'>) {
  return <CatalogView base="/ofertas" raw={await props.searchParams} offersOnly heading="Ofertas especiales" />;
}
