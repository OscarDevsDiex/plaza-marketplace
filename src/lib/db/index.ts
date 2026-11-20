import 'server-only';
import { connection } from 'next/server';
import { createDb, type DB } from './client';

// Una sola instancia por proceso (el recargado en caliente de desarrollo reimporta módulos).
const g = globalThis as unknown as { __db?: DB };

/** Se crea al primer uso: importar este módulo no abre la base de datos (importante durante `next build`). */
export const db: DB = new Proxy({} as DB, {
  get(_t, prop) {
    g.__db ??= createDb();
    const value = Reflect.get(g.__db, prop);
    return typeof value === 'function' ? value.bind(g.__db) : value;
  },
});

export * as schema from './schema';

/**
 * Marca la lectura como dato de petición (siempre fresco) para Cache Components: precios y existencias
 * no deben quedar congelados en un prerender. Fuera de una petición (pruebas) no hace nada.
 */
export async function requestData() {
  try {
    await connection();
  } catch (e) {
    if (!(e instanceof Error && /outside a request scope/i.test(e.message))) throw e;
  }
}
