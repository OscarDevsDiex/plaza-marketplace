'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Error inesperado en una página: mensaje genérico (sin detalles internos) y opción de reintentar. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="grid size-14 place-items-center rounded-full bg-danger-soft text-danger"><AlertTriangle className="size-6" /></div>
      <h1 className="mt-5 text-2xl font-semibold">Algo salió mal</h1>
      <p className="mt-2 text-sm text-muted">Tuvimos un problema al cargar esta página. Intenta de nuevo en un momento.</p>
      {error.digest && <p className="mt-2 font-mono text-xs text-faint">Referencia: {error.digest}</p>}
      <Button onClick={reset} className="mt-6">Reintentar</Button>
    </main>
  );
}
