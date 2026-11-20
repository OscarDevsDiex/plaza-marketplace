'use client';

import { useActionState } from 'react';
import { Heart, UserPlus, UserCheck, ThumbsUp, Flag } from 'lucide-react';
import type { ActionState } from '@/lib/errors';
import { buttonClass } from '@/components/ui/button';
import { FormMessage, SubmitButton } from '@/components/ui/action-form';
import { Select, Textarea } from '@/components/ui/form';
import { cn } from '@/lib/utils';

type BoundAction = (state: ActionState) => Promise<ActionState>;

/** Corazón de favoritos con estado optimista simple (el servidor confirma). */
export function FavoriteButton({ action, initial, compact }: { action: BoundAction; initial: boolean; compact?: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const on = state?.ok ? state.ok.startsWith('Guardado') : initial;
  return (
    <form action={formAction}>
      <button disabled={pending} aria-pressed={on} className={buttonClass('secondary', compact ? 'icon' : 'lg', cn(!compact && 'w-full', on && 'text-brand'))} title={on ? 'Quitar de favoritos' : 'Guardar en favoritos'}>
        <Heart className={cn('size-4 transition-transform', on && 'fill-brand scale-110')} />
        {!compact && (on ? 'En favoritos' : 'Guardar')}
      </button>
    </form>
  );
}

export function FollowButton({ action, initial }: { action: BoundAction; initial: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const on = state?.ok ? state.ok.startsWith('Ahora') : initial;
  return (
    <form action={formAction}>
      <button disabled={pending} className={buttonClass(on ? 'secondary' : 'primary', 'sm')}>
        {on ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}{on ? 'Siguiendo' : 'Seguir tienda'}
      </button>
      {state?.error && <FormMessage state={state} />}
    </form>
  );
}

export function HelpfulButton({ action, count }: { action: BoundAction; count: number }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="inline">
      <button disabled={pending} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted transition-colors hover:bg-subtle hover:text-ink" title={state?.error}>
        <ThumbsUp className="size-3.5" /> Útil{count > 0 && ` (${count})`}
      </button>
      {state?.error && <span className="ml-2 text-xs text-danger">{state.error}</span>}
    </form>
  );
}

const REASONS: [string, string][] = [['fraude', 'Posible fraude o estafa'], ['producto_prohibido', 'Producto prohibido'], ['informacion_falsa', 'Información falsa o engañosa'], ['contenido_ofensivo', 'Contenido ofensivo'], ['spam', 'Spam'], ['otro', 'Otro motivo']];

/** Reporte de producto, reseña o tienda. Desplegable para no saturar la interfaz. */
export function ReportForm({ action, targetType, targetId, label = 'Reportar' }: { action: (s: ActionState, fd: FormData) => Promise<ActionState>; targetType: 'product' | 'review' | 'store'; targetId: string; label?: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <details className="group text-xs">
      <summary className="inline-flex items-center gap-1 text-muted hover:text-ink"><Flag className="size-3.5" /> {label}</summary>
      {state?.ok ? <FormMessage state={state} /> : (
        <form action={formAction} className="mt-2 w-72 max-w-full space-y-2 rounded-xl bg-surface p-3 shadow-pop animate-pop">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />
          <Select name="reason" required defaultValue="" aria-label="Motivo">
            <option value="" disabled>Elige un motivo</option>
            {REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </Select>
          <Textarea name="details" placeholder="Detalles (opcional)" maxLength={1000} className="min-h-16" />
          <SubmitButton size="sm" className="w-full">Enviar reporte</SubmitButton>
          <FormMessage state={state} />
        </form>
      )}
    </details>
  );
}
