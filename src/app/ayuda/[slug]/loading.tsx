export default function Loading() {
  return <div className="mx-auto max-w-5xl space-y-4 px-4 py-10 sm:px-6" aria-busy><div className="skeleton h-9 w-72" />{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-4 w-full max-w-2xl" />)}</div>;
}
