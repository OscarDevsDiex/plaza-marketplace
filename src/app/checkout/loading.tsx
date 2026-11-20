export default function Loading() {
  return (
    <div className="mx-auto max-w-[1200px] px-4 py-8 sm:px-6" aria-busy aria-label="Cargando">
      <div className="skeleton h-8 w-56" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">{[280, 140, 160].map((h) => <div key={h} className="skeleton rounded-xl" style={{ height: h }} />)}</div>
        <div className="skeleton h-96 rounded-xl" />
      </div>
    </div>
  );
}
