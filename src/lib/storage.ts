import { AppError } from '@/lib/errors';
import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp, { type Metadata } from 'sharp';
import { randomToken } from '@/lib/crypto';
import { LIMITS } from '@/lib/config';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';

/**
 * Almacenamiento de imágenes, servidas siempre por /media/[...key]. Dos drivers:
 * - "local": archivos en .data/uploads (desarrollo o servidor con disco persistente).
 * - "db": dentro de PostgreSQL (tabla media). Para hosting sin disco, como Vercel; es el valor por defecto ahí.
 * Para mucho volumen conviene un driver S3/R2 con la misma forma (put/readMedia).
 */
const DRIVER = process.env.STORAGE_DRIVER ?? (process.env.VERCEL ? 'db' : 'local');
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? '.data/uploads');
const ALLOWED = new Set(['jpeg', 'png', 'webp', 'avif', 'gif']);

export class UploadError extends AppError {}

async function put(key: string, data: Buffer) {
  if (DRIVER === 'db') {
    await db.insert(schema.media).values({ key, data, contentType: 'image/webp' });
  } else {
    const file = path.join(UPLOAD_DIR, key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, data);
  }
  return `/media/${key}`;
}

export async function readMedia(key: string): Promise<Buffer | null> {
  if (DRIVER === 'db') {
    const [row] = await db.select({ data: schema.media.data }).from(schema.media).where(eq(schema.media.key, key));
    return row ? Buffer.from(row.data) : null; // PGlite devuelve Uint8Array; postgres-js, Buffer
  }
  const file = path.resolve(UPLOAD_DIR, key);
  if (!file.startsWith(UPLOAD_DIR + path.sep)) return null; // evita salir de la carpeta (../)
  return fs.readFile(file).catch(() => null);
}

/**
 * Valida y re-codifica una imagen subida:
 * - el tipo se detecta por el contenido real (no por la extensión ni el Content-Type del navegador),
 * - se re-codifica a WebP, lo que elimina metadatos (GPS, cámara) y cualquier contenido incrustado,
 * - genera una versión grande y una miniatura.
 */
export async function saveImage(file: File, folder: 'products' | 'reviews' | 'stores') {
  if (!(file instanceof File) || file.size === 0) throw new UploadError('Archivo vacío');
  if (file.size > LIMITS.imageBytes) throw new UploadError('Cada imagen debe pesar menos de 8 MB');
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(input, { limitInputPixels: 50_000_000 }).metadata();
  } catch {
    throw new UploadError('El archivo no es una imagen válida');
  }
  if (!meta.format || !ALLOWED.has(meta.format)) throw new UploadError('Formato no permitido. Usa JPG, PNG, WEBP o AVIF.');
  if ((meta.width ?? 0) < 200 || (meta.height ?? 0) < 200) throw new UploadError('La imagen debe medir al menos 200 × 200 px');

  const base = sharp(input, { limitInputPixels: 50_000_000 }).rotate(); // respeta la orientación EXIF y luego la descarta
  const big = await base.clone().resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: 480, height: 480, fit: 'cover' }).webp({ quality: 78 }).toBuffer();
  const id = randomToken(12);
  const d = new Date();
  const prefix = `${folder}/${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    url: await put(`${prefix}/${id}.webp`, big.data),
    thumbUrl: await put(`${prefix}/${id}_t.webp`, thumb),
    width: big.info.width,
    height: big.info.height,
  };
}

/** Lee los archivos de un FormData respetando el límite de cantidad. */
export function filesFrom(form: FormData, field: string, max: number) {
  const files = form.getAll(field).filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > max) throw new UploadError(`Máximo ${max} imágenes`);
  return files;
}
