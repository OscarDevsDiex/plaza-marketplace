import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';
import { NavLink } from './nav-link';

export type NavItem = { href: string; label: string; icon: ReactNode; exact?: boolean; exclude?: string[] };

/**
 * Estructura común de los paneles (vendedor y administrador): barra lateral fija en escritorio,
 * navegación horizontal desplazable en móvil.
 */
export function DashboardShell({ title, subtitle, nav, children, footer }: { title: string; subtitle?: ReactNode; nav: NavItem[]; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col lg:flex-row">
      <aside className="border-b border-line bg-surface lg:sticky lg:top-[64px] lg:h-[calc(100dvh-64px)] lg:w-60 lg:shrink-0 lg:border-r lg:border-b-0">
        <div className="hidden px-5 pt-6 pb-4 lg:block">
          <div className="text-[13px] font-semibold">{title}</div>
          {subtitle && <div className="mt-0.5 truncate text-xs text-muted">{subtitle}</div>}
        </div>
        <nav className="scrollbar-none flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:py-0" aria-label={title}>
          {/* El estado "activo" depende de la URL: se resuelve en el cliente; mientras tanto se ven los mismos enlaces. */}
          <Suspense fallback={nav.map((n) => <Link key={n.href} href={n.href} className="flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-muted [&_svg]:size-4">{n.icon}{n.label}</Link>)}>
            {nav.map((n) => <NavLink key={n.href} href={n.href} exact={n.exact} exclude={n.exclude} icon={n.icon}>{n.label}</NavLink>)}
          </Suspense>
        </nav>
        {footer && <div className="hidden px-3 pt-6 lg:block">{footer}</div>}
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
    </div>
  );
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return <Link href={href} className="mb-4 inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-ink">← {children}</Link>;
}
