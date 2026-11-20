import type { ReactNode } from 'react';
import Link from 'next/link';

/** Plantilla para páginas de texto (ayuda y legal) con tipografía cuidada. */
export function ContentPage({ section, title, children, links }: { section: string; title: string; children: ReactNode; links: [string, string][] }) {
  return (
    <main className="mx-auto grid max-w-5xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[200px_1fr]">
      <nav aria-label={section} className="text-sm">
        <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">{section}</div>
        <ul className="space-y-1">{links.map(([href, label]) => <li key={href}><Link href={href} className="block rounded-md px-2 py-1.5 text-ink-2 hover:bg-subtle hover:text-ink">{label}</Link></li>)}</ul>
      </nav>
      <article className="max-w-2xl text-[15px] leading-relaxed text-ink-2 [&_a]:link [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink [&_li]:mt-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="text-3xl font-semibold text-ink">{title}</h1>
        {children}
      </article>
    </main>
  );
}
