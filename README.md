# Plaza — Marketplace multivendedor

Marketplace donde cualquier persona crea una cuenta, compra, y con la misma cuenta abre su tienda y vende. Incluye panel de vendedor, panel de administración, pagos (Stripe, Mercado Pago y un entorno Sandbox), reseñas verificadas, envíos con seguimiento y notificaciones.

## Arrancar en local

Requisitos: Node.js 22.13 o más nuevo. No necesitas instalar una base de datos.

```bash
npm install
npm run db:seed     # crea la base local y los datos de demostración
npm run dev         # http://localhost:3005
```

Cuentas de demostración (contraseña `Demo12345!`):

| Rol | Correo |
|---|---|
| Administración | admin@plaza.dev |
| Vendedores | mariana@demo.dev · andres@demo.dev · valeria@demo.dev · rodrigo@demo.dev |
| Compradores | lucia@demo.dev · diego@demo.dev · sofia@demo.dev |

- Los correos (verificación, recuperación de contraseña, avisos de pedidos) se ven en **http://localhost:3005/dev/correos** mientras no configures Resend.
- Los pagos usan el **Sandbox**: una pantalla marcada como prueba donde apruebas o rechazas el pago. No se cobra nada.
- Las tiendas y productos de demostración llevan la etiqueta **DEMO**.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3005) |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm test` | Pruebas (precios, cupones, comisiones, contraseñas, restricciones de la base) |
| `npm run typecheck` · `npm run lint` | Verificación de tipos y estilo |
| `npm run db:generate` | Genera una migración después de cambiar `src/lib/db/schema.ts` |
| `npm run db:migrate` | Aplica migraciones pendientes |
| `npm run db:seed` | Datos de demostración (se niega a correr en producción) |
| `npm run db:reset` | Borra la base local y la vuelve a crear con datos de demostración |

> La base local (PGlite) solo admite un proceso a la vez: detén `npm run dev` antes de `db:seed` o `db:reset`.

## Publicar en producción

1. Crea una base PostgreSQL (Neon o Supabase tienen plan gratuito) y define `DATABASE_URL`.
2. Define `NEXT_PUBLIC_APP_URL` con tu dominio `https://`.
3. Ejecuta `npm run db:migrate` contra esa base (una vez por despliegue).
4. Configura al menos un proveedor de pago (Stripe o Mercado Pago) con su secreto de webhook, y Resend para los correos. Ver `.env.example`.
5. Programa `GET /api/cron/expirar-pedidos` cada 10–15 minutos con `CRON_SECRET`.
6. Imágenes: en un servidor con disco persistente funciona tal cual; en Vercel/serverless agrega el driver S3/R2 (ver `docs/ARQUITECTURA.md`).

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md) — decisiones técnicas, módulos, modelo de datos, pagos, seguridad y pendientes.
- [docs/CONVENCIONES.md](docs/CONVENCIONES.md) — reglas para agregar código (Next.js 16, seguridad, UI).
