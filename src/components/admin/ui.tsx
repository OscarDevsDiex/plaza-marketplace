import type { ReactNode } from 'react';
import Link from 'next/link';
import Form from 'next/form';
import type { ActionState } from '@/lib/errors';
import { ActionForm, SubmitButton } from '@/components/ui/action-form';
import { Button, buttonClass } from '@/components/ui/button';
import { Checkbox, Input, Select, Textarea } from '@/components/ui/form';
import { Skeleton } from '@/components/ui/misc';
import { cn } from '@/lib/utils';

export const td = 'px-4 py-3 align-top';
export const tr = 'border-t border-line';

/** Tabla compacta dentro de una tarjeta; se desplaza horizontalmente en móvil. */
export function DataTable({ head, children, className }: { head: ReactNode[]; children: ReactNode; className?: string }) {
  return (
    <div className={cn('card overflow-x-auto', className)}>
      <table className="w-full text-sm">
        <thead>
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 text-left text-xs font-medium whitespace-nowrap text-muted">{h}</th>)}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

type SelectFilter = { name: string; value: string; all: string; options: [string, string][] };

/** Búsqueda y filtros como formulario GET (los filtros viven en la URL). */
export function Filters({ base, q, placeholder, selects = [], total }: { base: string; q?: string; placeholder?: string; selects?: SelectFilter[]; total?: number }) {
  const active = !!q || selects.some((s) => s.value);
  return (
    <Form action={base} className="mb-4 flex flex-wrap items-center gap-2">
      {placeholder !== undefined && <Input name="q" defaultValue={q} placeholder={placeholder} aria-label="Buscar" className="h-9 w-full sm:w-64" />}
      {selects.map((s) => (
        <Select key={s.name} name={s.name} defaultValue={s.value} aria-label={s.all} className="h-9 w-auto min-w-36">
          <option value="">{s.all}</option>
          {s.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </Select>
      ))}
      <Button type="submit" variant="secondary" size="sm" className="h-9">Filtrar</Button>
      {active && <Link href={base} className="px-2 text-sm text-muted hover:text-ink">Limpiar</Link>}
      {total !== undefined && <span className="ml-auto text-xs text-muted tabular-nums">{total.toLocaleString('es-MX')} resultados</span>}
    </Form>
  );
}

type Action = (state: ActionState, fd: FormData) => Promise<ActionState>;

/**
 * Acción en dos pasos: el botón despliega un pequeño formulario con motivo opcional y/o casilla de confirmación.
 * La casilla `confirm` también se verifica en el servidor.
 */
export function ConfirmAction({ action, label, submit, variant = 'danger', confirm, reason, hidden, children }: {
  action: Action; label: ReactNode; submit?: string; variant?: 'danger' | 'secondary' | 'primary';
  confirm?: string; reason?: { label: string; required?: boolean; placeholder?: string }; hidden?: Record<string, string>; children?: ReactNode;
}) {
  return (
    <details className="group">
      <summary className={buttonClass(variant === 'primary' ? 'secondary' : variant, 'sm')}>{label}</summary>
      <ActionForm action={action} className="mt-2 w-72 max-w-full space-y-3 rounded-xl border border-line bg-surface p-3 text-left shadow-lift">
        {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        {children}
        {reason && (
          <label className="block space-y-1.5">
            <span className="text-[13px] font-medium text-ink-2">{reason.label}</span>
            <Textarea name="reason" required={reason.required} minLength={reason.required ? 3 : undefined} maxLength={500} placeholder={reason.placeholder} className="min-h-20" />
          </label>
        )}
        {confirm && <Checkbox name="confirm" required label={confirm} />}
        <SubmitButton variant={variant} size="sm">{submit ?? label}</SubmitButton>
      </ActionForm>
    </details>
  );
}

/** Botón de una sola acción (para operaciones reversibles y no destructivas). */
export function QuickAction({ action, children, variant = 'secondary', hidden }: { action: Action; children: ReactNode; variant?: 'secondary' | 'primary' | 'ghost'; hidden?: Record<string, string> }) {
  return (
    <ActionForm action={action}>
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton variant={variant} size="sm">{children}</SubmitButton>
    </ActionForm>
  );
}

export function Section({ title, description, actions, children, className }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mt-8', className)}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

export const Muted = ({ children }: { children: ReactNode }) => <span className="text-xs text-muted">{children}</span>;

export function TableSkeleton({ rows = 8, stats = 0 }: { rows?: number; stats?: number }) {
  return (
    <div aria-busy aria-label="Cargando">
      <Skeleton className="mb-2 h-7 w-48" />
      <Skeleton className="mb-6 h-4 w-72" />
      {stats > 0 && <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: stats }, (_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>}
      <div className="mb-4 flex gap-2"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-36" /><Skeleton className="h-9 w-20" /></div>
      <div className="card space-y-3 p-4">{Array.from({ length: rows }, (_, i) => <Skeleton key={i} className="h-6 w-full" />)}</div>
    </div>
  );
}

export const linkClass = 'font-medium text-ink hover:underline underline-offset-4';
/** Enlace a la página pública (tienda, producto) en otra pestaña. */
export function PublicLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} target="_blank" className="text-xs text-muted underline-offset-4 hover:text-ink hover:underline">{children} ↗</Link>;
}
