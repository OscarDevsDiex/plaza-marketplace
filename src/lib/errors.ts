import { unstable_rethrow } from 'next/navigation';

/** Error con un mensaje seguro de mostrar al usuario. Cualquier otro error se registra y se muestra un mensaje genérico. */
export class AppError extends Error {}

export type ActionState = { ok?: string; error?: string; at?: number } | null;

/**
 * Envuelve el cuerpo de una Server Action: convierte AppError en un mensaje para el formulario,
 * deja pasar redirect()/notFound() y oculta detalles internos de errores inesperados.
 */
export async function runAction(fn: () => Promise<string | void>): Promise<ActionState> {
  try {
    const ok = await fn();
    return { ok: ok || 'Cambios guardados', at: Date.now() };
  } catch (e) {
    unstable_rethrow(e);
    if (e instanceof AppError) return { error: e.message, at: Date.now() };
    console.error(e);
    return { error: 'Ocurrió un error inesperado. Intenta de nuevo.', at: Date.now() };
  }
}

export const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? '').trim().slice(0, max);
export const int = (fd: FormData, k: string) => {
  const n = Number(fd.get(k));
  return Number.isInteger(n) ? n : NaN;
};
