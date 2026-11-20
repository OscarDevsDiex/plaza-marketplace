export default function Loading() {
  return <div className="mx-auto max-w-5xl space-y-6 px-4 py-10" aria-busy><div className="skeleton h-8 w-64" />{[0, 1].map((i) => <div key={i} className="skeleton h-80 rounded-xl" />)}</div>;
}
