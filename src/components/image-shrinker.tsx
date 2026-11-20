'use client';

import { useEffect } from 'react';

const MAX_SIDE = 2000;
const SHRINK_OVER = 1_500_000; // solo se tocan fotos de más de 1.5 MB

/**
 * Reduce en el navegador las fotos grandes de cualquier <input type="file" accept="image/…"> antes de enviarlas.
 * Motivo: Vercel limita cada petición a 4.5 MB y una foto de celular pesa 3-5 MB. El servidor vuelve a validar
 * y re-codificar todo, así que esto solo ahorra transferencia. Mientras procesa, el formulario no se puede enviar.
 */
export function ImageShrinker() {
  useEffect(() => {
    const onChange = async (e: Event) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || input.type !== 'file' || !input.accept.includes('image') || !input.files?.length) return;
      const files = Array.from(input.files);
      if (!files.some((f) => f.size > SHRINK_OVER)) return;
      input.setCustomValidity('Optimizando tus fotos, espera un momento…');
      try {
        const out = await Promise.all(files.map(shrink));
        const dt = new DataTransfer();
        out.forEach((f) => dt.items.add(f));
        input.files = dt.files;
      } finally {
        input.setCustomValidity('');
      }
    };
    document.addEventListener('change', onChange, true);
    return () => document.removeEventListener('change', onChange, true);
  }, []);
  return null;
}

async function shrink(file: File): Promise<File> {
  if (file.size <= SHRINK_OVER || !file.type.startsWith('image/')) return file;
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file; // formato que el navegador no puede leer: se envía tal cual y el servidor decide
  }
}
