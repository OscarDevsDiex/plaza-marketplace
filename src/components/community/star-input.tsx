'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

const LABELS = ['', 'Muy malo', 'Malo', 'Regular', 'Bueno', 'Excelente'];

/** Selector de 1 a 5 estrellas accesible (radios nativos, navegable con teclado). */
export function StarInput({ name }: { name: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div className="flex" role="radiogroup" aria-label="Calificación" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className="cursor-pointer p-0.5" onMouseEnter={() => setHover(n)}>
            <input type="radio" name={name} value={n} required className="peer sr-only" onChange={() => setValue(n)} />
            <Star className={cn('size-8 transition-transform peer-focus-visible:ring-2 peer-focus-visible:ring-brand', n <= shown ? 'fill-star text-star' : 'text-line-strong', n === hover && 'scale-110')} strokeWidth={1.5} />
            <span className="sr-only">{n} {n === 1 ? 'estrella' : 'estrellas'}</span>
          </label>
        ))}
      </div>
      <span className="text-sm text-muted">{LABELS[shown]}</span>
    </div>
  );
}
