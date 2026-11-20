import { ProductGridSkeleton } from '@/components/product/product-card';

export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6" aria-busy aria-label="Cargando tienda">
      <div className="skeleton mt-6 h-40 rounded-2xl sm:h-56" />
      <div className="mt-6 flex items-center gap-5"><div className="skeleton size-24 rounded-2xl" /><div className="space-y-2"><div className="skeleton h-7 w-56" /><div className="skeleton h-4 w-40" /></div></div>
      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      <ProductGridSkeleton count={8} className="mt-10" />
    </div>
  );
}
