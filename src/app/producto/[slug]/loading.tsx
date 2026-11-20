export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6" aria-busy aria-label="Cargando producto">
      <div className="skeleton mb-5 h-4 w-56" />
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="flex gap-3"><div className="hidden w-[72px] space-y-2 md:block">{[0, 1, 2].map((i) => <div key={i} className="skeleton aspect-square rounded-lg" />)}</div><div className="skeleton aspect-square flex-1 rounded-2xl" /></div>
        <div className="space-y-4">
          <div className="skeleton h-4 w-32" /><div className="skeleton h-8 w-4/5" /><div className="skeleton h-4 w-48" />
          <div className="space-y-4 rounded-2xl border border-line bg-surface p-6"><div className="skeleton h-9 w-40" /><div className="flex gap-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 w-16" />)}</div><div className="skeleton h-12 w-full rounded-xl" /><div className="skeleton h-12 w-full rounded-xl" /></div>
        </div>
      </div>
    </div>
  );
}
