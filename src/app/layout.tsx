import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { APP_NAME, APP_URL, IS_PROD } from '@/lib/config';
import { Header } from '@/components/site/header';
import { Footer } from '@/components/site/footer';
import { ImageShrinker } from '@/components/image-shrinker';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${APP_NAME} · Compra y vende en México`, template: `%s · ${APP_NAME}` },
  description: 'Marketplace con miles de productos de tiendas independientes. Compra protegida, reseñas verificadas y envíos a todo México.',
  applicationName: APP_NAME,
  openGraph: { type: 'website', siteName: APP_NAME, locale: 'es_MX' },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#ffffff', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="es-MX" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a href="#contenido" className="sr-only z-50 rounded-md bg-ink px-3 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2">Saltar al contenido</a>
        {IS_PROD && process.env.ENABLE_SANDBOX_PAYMENTS === 'true' && (
          <div className="bg-warning-soft px-4 py-1.5 text-center text-xs font-medium text-warning">Sitio de demostración: los pagos son de prueba (Sandbox) y no se cobra nada.</div>
        )}
        <Header />
        <div id="contenido" className="flex-1">{children}</div>
        <Footer />
        <ImageShrinker />
      </body>
    </html>
  );
}
