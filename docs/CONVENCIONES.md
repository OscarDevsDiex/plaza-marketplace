# Convenciones de código

Guía corta para que todo el proyecto se vea y se comporte igual. Léela antes de agregar una ruta.

## Next.js 16 (Cache Components activado)

- **Toda lectura de base de datos, `cookies()`, `headers()`, `params` o `searchParams` debe quedar dentro de un `<Suspense>`.** La forma estándar: cada carpeta de ruta con datos tiene un `loading.tsx` (esqueleto con la clase `skeleton`), y el `page.tsx` hace `await` directamente.
- Los **layouts no deben hacer `await` de la sesión en su nivel superior**: renderiza la estructura estática y mete lo que lee la sesión en un componente dentro de `<Suspense>`.
- `new Date()` / `Date.now()` / `Math.random()` durante el render solo después de haber leído datos de la petición (o de llamar a `connection()` de `next/server`).
- **Una consulta a la base de datos que no venga después de leer `cookies()`/`params`/`searchParams` (o de `requireUser()`/`requireSeller()`/`requireAdmin()`) debe ir precedida de `await connection()`**: el driver usa la hora interna y Next lo marca como error de prerender.
- `params` y `searchParams` son Promesas: `const { id } = await props.params`. Tipos globales: `PageProps<'/ruta/[id]'>`, `LayoutProps<'/ruta'>`, `RouteContext<'/ruta'>`.
- Documentación de esta versión: `node_modules/next/dist/docs/`.

## Seguridad (no negociable)

- **Cada página protegida y cada Server Action verifica permisos cerca de los datos**, aunque el layout ya lo haga (los layouts no se re-ejecutan en navegaciones entre páginas hermanas):
  - Páginas: `requireUser()`, `requireSeller()` (devuelve `{ user, store }`), `requireAdmin()` — `@/lib/auth/guards`.
  - Acciones: `assertUser()`, `assertSeller()`, `assertAdmin()` (lanzan `AppError`).
- **Vendedor: toda consulta se filtra por `store.id`** de la sesión, nunca por un id que venga del formulario. Para leer un recurso por id: `where(and(eq(x.id, id), eq(x.storeId, store.id)))`; si no existe → `notFound()`.
- Precios, totales, comisiones y existencias se calculan **en el servidor** (`lib/services/pricing.ts`).
- Valida toda entrada (zod o los helpers `str()`/`int()` de `@/lib/errors`). Dinero: `parseMoney()` → centavos.
- Acciones sensibles → `audit(actorId, 'entidad.accion', 'entidad', id, { … })` de `@/lib/security`.
- Imágenes: solo con `saveImage(file, 'products' | 'stores' | 'reviews')` y `filesFrom(fd, 'images', max)` de `@/lib/storage` (re-codifica, quita metadatos, limita tamaño).

## Server Actions

- Van en `src/actions/<area>.ts` con `'use server'` arriba.
- Firma para formularios: `(prev: ActionState, fd: FormData) => Promise<ActionState>`; el cuerpo dentro de `runAction(async () => { …; return 'Mensaje de éxito' })`.
- Argumentos extra con `.bind(null, id)` desde el componente servidor.
- Después de mutar: `revalidatePath('/ruta')` o `refresh()` (`next/cache`). `redirect()` va fuera de `runAction` (o se re-lanza solo).
- Errores para el usuario: `throw new AppError('Mensaje claro en español')`. Cualquier otro error se registra y se muestra un mensaje genérico.

## Base de datos

- `import { db, schema } from '@/lib/db'`. Drizzle con `casing: 'snake_case'`.
- **Dentro de `db.transaction(async (tx) => …)` usa solo `tx`.** En desarrollo PGlite tiene una sola conexión: una consulta con `db` dentro de una transacción se queda bloqueada para siempre. Las notificaciones (`notify`) y `audit` van **después** de la transacción.
- Dinero en centavos (`integer`); comisiones en puntos base (1 % = 100).
- Cambios de esquema: editar `src/lib/db/schema.ts` → `npm run db:generate` → `npm run db:migrate`.

## Interfaz

- Componentes en `src/components/ui`: `Button`/`ButtonLink`/`buttonClass`, `Input`, `Textarea`, `Select`, `Field`, `Checkbox`, `ActionForm` + `SubmitButton`, `Badge`, `Skeleton`, `Stars`, `Price`, `EmptyState`, `Pagination`, `PageHeader`, `Stat`, `DemoBadge`, `AreaChart`, `BarList`. Paneles: `DashboardShell`, `BackLink`.
- Colores **solo con tokens**: `bg-ink`, `text-muted`, `text-faint`, `border-line`, `bg-subtle`, `bg-surface`, `bg-canvas`, `text-brand`/`bg-brand-soft`, `text-success`/`bg-success-soft`, `warning`, `danger`, `info`. Tarjetas: clase `card`. Iconos: `lucide-react`.
- Tablas: `<div className="card overflow-x-auto"><table className="w-full text-sm">`, encabezados `text-left text-xs font-medium text-muted`, filas con `border-t border-line`, búsqueda y filtros como formulario GET, paginación con `<Pagination>`.
- Textos en español de México, tono claro y breve. Fechas: `formatDate`/`formatDateTime`; dinero: `formatMoney`; número de pedido: `orderNumber(n)`.
- **No dejes botones sin funcionalidad**: si algo aún no existe, no se muestra.
- Los datos de demostración llevan `isDemo` y se marcan con `<DemoBadge />`.

## Verificación

- `npx tsc --noEmit` y `npx eslint src` sin errores.
- `npm test` para la lógica de negocio.
