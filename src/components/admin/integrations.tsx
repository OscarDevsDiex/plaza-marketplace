import { CheckCircle2, XCircle } from 'lucide-react';
import { integrationStatus } from '@/lib/services/admin';

/** Estado de integraciones: solo si están configuradas, nunca sus valores. */
export function IntegrationList() {
  return (
    <ul className="divide-y divide-line">
      {integrationStatus().map((i) => (
        <li key={i.label} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="text-ink-2">{i.label}</span>
          {i.ok
            ? <span className="flex shrink-0 items-center gap-1.5 text-success"><CheckCircle2 className="size-4" />Configurado</span>
            : <span className="flex shrink-0 items-center gap-1.5 text-muted"><XCircle className="size-4" />Sin configurar</span>}
        </li>
      ))}
    </ul>
  );
}
