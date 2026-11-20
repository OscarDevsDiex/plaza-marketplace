export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6" aria-busy aria-label="Cargando carrito">
      <div className="skeleton h-8 w-48" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">{[0, 1].map((i) => <div key={i} className="card space-y-4 p-5"><div className="skeleton h-4 w-40" />{[0, 1].map((j) => <div key={j} className="flex gap-4"><div className="skeleton size-24 rounded-lg" /><div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/4" /><div className="skeleton h-9 w-24" /></div></div>)}</div>)}</div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}
