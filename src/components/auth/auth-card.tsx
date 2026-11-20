import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

/** Contenedor de las pantallas de acceso: centrado, una sola columna, sin distracciones. */
export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <main className="flex min-h-[calc(100dvh-280px)] items-start justify-center px-4 py-12 sm:py-20">
      <div className="w-full max-w-[400px] animate-fade-up">
        <h1 className="text-2xl font-semibold">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm text-muted">{subtitle}</p>}
        <div className="mt-7">{children}</div>
        {footer && <div className="mt-6 text-center text-sm text-muted">{footer}</div>}
        <p className="mt-10 flex items-center justify-center gap-1.5 text-xs text-faint"><ShieldCheck className="size-3.5" />Conexión cifrada · Nunca compartimos tus datos</p>
      </div>
    </main>
  );
}

export function AuthSkeleton() {
  return <div className="mx-auto max-w-[400px] space-y-4 px-4 py-20" aria-busy><div className="skeleton h-7 w-48" /><div className="skeleton h-4 w-64" /><div className="skeleton mt-6 h-10 w-full" /><div className="skeleton h-10 w-full" /><div className="skeleton h-12 w-full rounded-xl" /></div>;
}
