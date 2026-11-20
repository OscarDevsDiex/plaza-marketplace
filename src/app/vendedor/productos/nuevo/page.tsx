import { requireSeller } from '@/lib/auth/guards';
import { getCategoryTree } from '@/lib/services/catalog';
import { saveProductAction } from '@/actions/seller';
import { BackLink } from '@/components/dashboard-shell';
import { PageHeader } from '@/components/ui/misc';
import { ProductForm } from '@/components/seller/product-form';

export const metadata = { title: 'Publicar producto' };

export default async function NewProduct() {
  await requireSeller();
  const categories = await getCategoryTree();
  return (
    <>
      <BackLink href="/vendedor/productos">Productos</BackLink>
      <PageHeader title="Publicar producto" description="Guárdalo como borrador para terminarlo después, o publícalo para que los compradores lo vean." />
      <ProductForm action={saveProductAction.bind(null, null)} categories={categories} />
    </>
  );
}
