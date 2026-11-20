'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function NavLink({ href, exact, exclude, icon, children }: { href: string; exact?: boolean; exclude?: string[]; icon?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  const active = (exact ? path === href : path === href || path.startsWith(href + '/')) && !exclude?.some((x) => path.startsWith(x));
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors [&_svg]:size-4',
        active ? 'bg-subtle text-ink' : 'text-muted hover:bg-subtle/70 hover:text-ink',
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
