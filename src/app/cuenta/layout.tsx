import type { Metadata } from 'next';
import { LayoutGrid, Package, Heart, Store, MapPin, Bell, KeyRound } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard-shell';

export const metadata: Metadata = { title: { default: 'Mi cuenta', template: '%s · Mi cuenta' }, robots: { index: false } };

const nav = [
  { href: '/cuenta', label: 'Resumen', icon: <LayoutGrid />, exact: true },
  { href: '/cuenta/pedidos', label: 'Mis compras', icon: <Package /> },
  { href: '/cuenta/favoritos', label: 'Favoritos', icon: <Heart /> },
  { href: '/cuenta/siguiendo', label: 'Tiendas que sigo', icon: <Store /> },
  { href: '/cuenta/direcciones', label: 'Direcciones', icon: <MapPin /> },
  { href: '/cuenta/notificaciones', label: 'Notificaciones', icon: <Bell /> },
  { href: '/cuenta/seguridad', label: 'Seguridad', icon: <KeyRound /> },
];

// El layout no lee la sesión (Cache Components): cada página la verifica con requireUser().
export default function AccountLayout({ children }: LayoutProps<'/cuenta'>) {
  return <DashboardShell title="Mi cuenta" nav={nav}>{children}</DashboardShell>;
}
