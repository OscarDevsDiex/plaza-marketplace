export default function Loading() {
  return (
    <div className="space-y-4" aria-busy aria-label="Cargando">
      <div className="skeleton h-8 w-56" /><div className="skeleton h-4 w-80" />
      <div className="grid gap-4 pt-4 sm:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
      {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
    </div>
  );
}
