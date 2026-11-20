'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Check, Plus, Loader2 } from 'lucide-react';
import { addToCartAction } from '@/actions/shop';
import { buttonClass } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Botón compacto de las tarjetas. Si el producto tiene varias opciones, lleva a elegirla. */
export function QuickAdd({ variantId, slug, disabled }: { variantId: string | null; slug: string; disabled?: boolean }) {
  const [state, action, pending] = useActionState(addToCartAction, null);
  if (disabled) return <span className={buttonClass('secondary', 'sm', 'w-full text-muted')} aria-disabled>Agotado</span>;
  if (!variantId) return <Link href={`/producto/${slug}`} className={buttonClass('secondary', 'sm', 'w-full')}>Elegir opción</Link>;
  const done = state?.ok && !pending;
  return (
    <form action={action}>
      <input type="hidden" name="variantId" value={variantId} />
      <input type="hidden" name="quantity" value="1" />
      <button
        disabled={pending}
        className={buttonClass(done ? 'secondary' : 'primary', 'sm', cn('w-full', done && 'text-success'))}
        aria-live="polite"
        title={state?.error}
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : done ? <Check className="size-3.5" /> : <Plus className="size-3.5" />}
        {state?.error ? 'Ver producto' : done ? 'Agregado' : 'Agregar'}
      </button>
    </form>
  );
}
