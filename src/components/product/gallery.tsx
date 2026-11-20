'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

export function Gallery({ images, title }: { images: { url: string; thumbUrl: string | null; alt: string | null }[]; title: string }) {
  const [i, setI] = useState(0);
  const current = images[i];
  return (
    <div className="flex flex-col-reverse gap-3 md:flex-row">
      {images.length > 1 && (
        <div className="scrollbar-none flex gap-2 overflow-x-auto md:w-[72px] md:flex-col md:overflow-visible">
          {images.map((im, k) => (
            <button
              key={im.url}
              type="button"
              onClick={() => setI(k)}
              onMouseEnter={() => setI(k)}
              aria-label={`Ver imagen ${k + 1} de ${images.length}`}
              aria-current={k === i}
              className={cn('aspect-square w-16 shrink-0 overflow-hidden rounded-lg bg-subtle ring-offset-2 transition md:w-full', k === i ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100')}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.thumbUrl ?? im.url} alt="" className="size-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <div className="relative aspect-square flex-1 overflow-hidden rounded-2xl bg-subtle">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element -- imágenes re-codificadas a WebP al subirlas
          <img key={current.url} src={current.url} alt={current.alt ?? title} className="size-full object-cover animate-fade-up" fetchPriority="high" width={1200} height={1200} />
        ) : (
          <div className="grid size-full place-items-center text-sm text-muted">Sin imagen</div>
        )}
      </div>
    </div>
  );
}
