'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { ActionState } from '@/lib/errors';
import { buttonClass } from './button';
import { cn } from '@/lib/utils';

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/**
 * Formulario conectado a una Server Action con useActionState.
 * Muestra el mensaje de éxito/error que devuelve runAction() y funciona sin JavaScript.
 */
export function ActionForm({ action, children, className, resetOnSuccess, hideSuccess, id }: {
  action: Action; children: ReactNode; className?: string; resetOnSuccess?: boolean; hideSuccess?: boolean; id?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} id={id} noValidate={false}>
      {children}
      <FormMessage state={state} hideSuccess={hideSuccess} />
    </form>
  );
}

export function FormMessage({ state, hideSuccess }: { state: ActionState; hideSuccess?: boolean }) {
  if (!state || (state.ok && hideSuccess)) return null;
  return (
    <p
      key={state.at}
      role={state.error ? 'alert' : 'status'}
      className={cn('mt-3 flex items-start gap-2 rounded-lg px-3 py-2 text-sm animate-fade-up', state.error ? 'bg-danger-soft text-danger' : 'bg-success-soft text-success')}
    >
      {state.error ? <AlertCircle className="mt-0.5 size-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 size-4 shrink-0" />}
      {state.error ?? state.ok}
    </p>
  );
}

/** Botón de envío con estado de carga automático. */
export function SubmitButton({ children, variant = 'primary', size = 'md', className, pendingText, ...rest }: {
  children: ReactNode; variant?: Parameters<typeof buttonClass>[0]; size?: Parameters<typeof buttonClass>[1]; className?: string; pendingText?: string;
  name?: string; value?: string; formAction?: Action | ((fd: FormData) => void);
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant, size, className)} {...(rest as object)}>
      {pending && <Loader2 className="size-4 animate-spin" />}
      {pending && pendingText ? pendingText : children}
    </button>
  );
}
