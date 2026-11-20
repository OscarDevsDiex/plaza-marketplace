import { setAdminRoleAction, setUserStatusAction } from '@/actions/admin';
import { ConfirmAction, QuickAction } from './ui';

/** Suspender/reactivar y dar/quitar admin. Sobre la propia cuenta no se ofrece nada (el servidor también lo impide). */
export function UserActions({ user, selfId }: { user: { id: string; status: string; roles: string[] }; selfId: string }) {
  if (user.id === selfId) return <span className="text-xs text-muted">Tu cuenta</span>;
  const isAdmin = user.roles.includes('admin');
  return (
    <div className="flex flex-wrap justify-end gap-2">
      {user.status === 'active' ? (
        <ConfirmAction
          action={setUserStatusAction.bind(null, user.id)} label="Suspender" hidden={{ status: 'suspended' }}
          reason={{ label: 'Motivo (opcional, queda en la auditoría)' }} confirm="Suspender la cuenta y cerrar todas sus sesiones"
        />
      ) : (
        <QuickAction action={setUserStatusAction.bind(null, user.id)} hidden={{ status: 'active' }}>Reactivar</QuickAction>
      )}
      <ConfirmAction
        action={setAdminRoleAction.bind(null, user.id)} variant="secondary" hidden={{ grant: isAdmin ? '0' : '1' }}
        label={isAdmin ? 'Quitar admin' : 'Hacer admin'}
        confirm={isAdmin ? 'Retirar el acceso de administrador' : 'Dar acceso total al panel de administración'}
      />
    </div>
  );
}
