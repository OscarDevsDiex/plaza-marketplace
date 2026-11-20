import { readMedia } from '@/lib/storage';

export async function GET(_req: Request, ctx: RouteContext<'/media/[...key]'>) {
  const { key } = await ctx.params;
  const rel = key.join('/');
  if (!/^[\w/-]+\.webp$/.test(rel)) return new Response('Not found', { status: 404 });
  const data = await readMedia(rel);
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      'Content-Type': 'image/webp',
      'Cache-Control': 'public, max-age=31536000, immutable', // el nombre es aleatorio: nunca cambia el contenido
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
