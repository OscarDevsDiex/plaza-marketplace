'use client';

import { useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Trash2, Loader2 } from 'lucide-react';
import { updateCartAction } from '@/actions/shop';

/** Cambia la cantidad al elegirla (envía el formulario); sin JS funciona con el botón "Actualizar". */
export function QtySelect({ variantId, quantity, max }: { variantId: string; quantity: number; max: number }) {
  const ref = useRef<HTMLFormElement>(null);
  const options = Array.from({ length: Math.max(1, Math.min(max, 20)) }, (_, i) => i + 1);
  if (!options.includes(quantity)) options.push(quantity);
  return (
    <div className="flex items-center gap-2">
      <form ref={ref} action={updateCartAction} className="flex items-center gap-2">
        <input type="hidden" name="variantId" value={variantId} />
        <label className="sr-only" htmlFor={`q-${variantId}`}>Cantidad</label>
        <select id={`q-${variantId}`} name="quantity" defaultValue={quantity} onChange={() => ref.current?.requestSubmit()} className="h-9 rounded-lg border border-line bg-surface px-2.5 text-sm tabular-nums hover:border-line-strong">
          {options.sort((a, b) => a - b).map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <noscript><button className="text-xs underline">Actualizar</button></noscript>
        <Pending />
      </form>
      <form action={updateCartAction}>
        <input type="hidden" name="variantId" value={variantId} />
        <input type="hidden" name="quantity" value="0" />
        <button className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger" aria-label="Eliminar del carrito"><Trash2 className="size-4" /></button>
      </form>
    </div>
  );
}

function Pending() {
  const { pending } = useFormStatus();
  return pending ? <Loader2 className="size-4 animate-spin text-muted" /> : null;
}
