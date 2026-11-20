import { SearchX } from 'lucide-react';
import { ButtonLink } from '@/components/ui/button';

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-subtle text-muted"><SearchX className="size-6" /></div>
      <h1 className="mt-5 text-2xl font-semibold">No encontramos esta página</h1>
      <p className="mt-2 text-sm text-muted">Puede que el producto ya no esté disponible o que el enlace sea incorrecto.</p>
      <div className="mt-6 flex gap-3"><ButtonLink href="/">Ir al inicio</ButtonLink><ButtonLink href="/buscar" variant="secondary">Explorar productos</ButtonLink></div>
    </main>
  );
}
