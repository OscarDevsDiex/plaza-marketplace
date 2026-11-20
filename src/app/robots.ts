import type { MetadataRoute } from 'next';
import { APP_URL } from '@/lib/config';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/cuenta', '/vendedor', '/admin', '/checkout', '/carrito', '/pagos', '/api/', '/dev/', '/buscar?'] }],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
