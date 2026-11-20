import { Suspense } from 'react';
import {
  CreditCard, Flag, FolderTree, LayoutDashboard, MessageSquare, Package, Percent, ScrollText, Settings, ShoppingBag, Store, Users,
} from 'lucide-react';
import { DashboardShell, type NavItem } from '@/components/dashboard-shell';
import { Skeleton } from '@/components/ui/misc';
import { requireAdmin } from '@/lib/auth/guards';

export const metadata = { title: 'Administración', robots: { index: false } };

const nav: NavItem[] = [
  { href: '/admin', label: 'Resumen', icon: <LayoutDashboard />, exact: true },
  { href: '/admin/usuarios', label: 'Usuarios', icon: <Users /> },
  { href: '/admin/tiendas', label: 'Tiendas', icon: <Store /> },
  { href: '/admin/productos', label: 'Productos', icon: <Package /> },
  { href: '/admin/pedidos', label: 'Pedidos', icon: <ShoppingBag /> },
  { href: '/admin/pagos', label: 'Pagos', icon: <CreditCard /> },
  { href: '/admin/comisiones', label: 'Comisiones', icon: <Percent /> },
  { href: '/admin/categorias', label: 'Categorías', icon: <FolderTree /> },
  { href: '/admin/reportes', label: 'Reportes', icon: <Flag /> },
  { href: '/admin/resenas', label: 'Reseñas', icon: <MessageSquare /> },
  { href: '/admin/auditoria', label: 'Auditoría', icon: <ScrollText /> },
  { href: '/admin/configuracion', label: 'Configuración', icon: <Settings /> },
];

/** El menú solo se muestra a administradores: quien no lo es recibe un 404 sin ver que la sección existe. */
async function AdminGate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return <DashboardShell title="Administración" subtitle={admin.email} nav={nav}>{children}</DashboardShell>;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-[1400px] space-y-4 px-4 py-8 lg:px-10"><Skeleton className="h-7 w-48" /><Skeleton className="h-64 w-full rounded-xl" /></div>}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
