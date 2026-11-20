import type { MetadataRoute } from 'next';
import { allPublicProductSlugs, allPublicStoreSlugs, getCategoryTree } from '@/lib/services/catalog';
import { requestData } from '@/lib/db';
import { APP_URL } from '@/lib/config';
import { HELP, LEGAL } from '@/content/pages';

/** Mapa del sitio con productos, tiendas, categorías y páginas informativas (se genera en cada petición). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await requestData();
  const [products, stores, tree] = await Promise.all([allPublicProductSlugs(), allPublicStoreSlugs(), getCategoryTree()]);
  const cats = tree.flatMap((c) => [c, ...c.children]);
  return [
    { url: APP_URL, changeFrequency: 'daily', priority: 1 },
    { url: `${APP_URL}/ofertas`, changeFrequency: 'daily', priority: 0.8 },
    ...cats.map((c) => ({ url: `${APP_URL}/categoria/${c.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    ...products.map((p) => ({ url: `${APP_URL}/producto/${p.slug}`, lastModified: p.updatedAt, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ...stores.map((s) => ({ url: `${APP_URL}/tienda/${s.slug}`, lastModified: s.updatedAt, changeFrequency: 'weekly' as const, priority: 0.6 })),
    ...[...Object.keys(HELP).map((k) => `/ayuda/${k}`), '/ayuda/comisiones', ...Object.keys(LEGAL).map((k) => `/legal/${k}`), '/vender']
      .map((path) => ({ url: APP_URL + path, changeFrequency: 'monthly' as const, priority: 0.3 })),
  ];
}
