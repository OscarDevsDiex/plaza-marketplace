import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

const control = 'w-full rounded-[10px] border border-line bg-surface px-3 text-sm text-ink shadow-[0_1px_1px_rgb(0_0_0/0.02)] transition-[border-color,box-shadow] placeholder:text-faint hover:border-line-strong focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/5 disabled:bg-subtle disabled:text-muted aria-invalid:border-danger';

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-10', className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-24 py-2.5 leading-relaxed', className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<'select'>) {
  return (
    <select
      className={cn(control, 'h-10 appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20stroke%3D%22%236e6e78%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22m4%206%204%204%204-4%22/%3E%3C/svg%3E")] bg-[position:right_10px_center] bg-no-repeat pr-9', className)}
      {...props}
    >
      {children}
    </select>
  );
}

export function Label({ className, ...props }: ComponentProps<'label'>) {
  return <label className={cn('block text-[13px] font-medium text-ink-2', className)} {...props} />;
}

/** Campo con etiqueta, ayuda opcional y el control como hijo. */
export function Field({ label, hint, htmlFor, children, className }: { label: ReactNode; hint?: ReactNode; htmlFor?: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-2.5 text-sm text-ink-2', className)}>
      <input type="checkbox" className="mt-0.5 size-4 shrink-0 rounded border-line-strong accent-ink" {...props} />
      <span>{label}</span>
    </label>
  );
}
