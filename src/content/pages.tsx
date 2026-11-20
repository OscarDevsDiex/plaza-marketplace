import type { ReactNode } from 'react';
import Link from 'next/link';
import { APP_NAME } from '@/lib/config';

/**
 * Contenido de ayuda y legal. Son plantillas razonables para operar en México:
 * deben revisarse con un abogado antes de lanzar (LFPDPPP, Ley Federal de Protección al Consumidor).
 */
export type Page = { title: string; description: string; body: ReactNode };

export const HELP: Record<string, Page> = {
  'compra-protegida': {
    title: 'Compra protegida',
    description: 'Si tu pedido no llega o no es lo que compraste, te devolvemos tu dinero.',
    body: (
      <>
        <p>Cada compra en {APP_NAME} está protegida desde que pagas hasta que confirmas la entrega.</p>
        <h2>Qué cubre</h2>
        <ul>
          <li>El pedido no llegó en el tiempo indicado por la tienda.</li>
          <li>Recibiste un producto distinto, incompleto o dañado.</li>
          <li>El producto no coincide con la descripción de la publicación.</li>
        </ul>
        <h2>Cómo funciona</h2>
        <ol>
          <li>Tu pago se procesa con Stripe o Mercado Pago; {APP_NAME} retiene el dinero de la tienda hasta que el pedido se entrega.</li>
          <li>Si hay un problema, escribe a soporte desde <Link href="/cuenta/pedidos">Mis compras</Link> en los 10 días siguientes a la entrega estimada.</li>
          <li>Revisamos el caso con la tienda y, si procede, reembolsamos el pago al mismo medio que usaste.</li>
        </ol>
        <p>No confirmes la entrega de un paquete que no has recibido: al confirmarla, la venta se considera completada.</p>
      </>
    ),
  },
  envios: {
    title: 'Envíos',
    description: 'Cómo funcionan los envíos de cada tienda y cómo rastrear tu paquete.',
    body: (
      <>
        <p>Cada tienda envía sus productos por separado. Si tu carrito incluye varias tiendas, recibirás varios paquetes, cada uno con su número de guía.</p>
        <h2>Costos</h2>
        <p>Cada tienda define su costo de envío y, en muchos casos, un monto a partir del cual el envío es gratis. Verás el costo exacto en el carrito antes de pagar.</p>
        <h2>Tiempos</h2>
        <p>La tienda prepara tu pedido en los días hábiles indicados en el producto; después, la paquetería suele tardar de 2 a 5 días hábiles según tu ubicación.</p>
        <h2>Seguimiento</h2>
        <p>Cuando la tienda envía tu pedido, te avisamos por correo y verás la paquetería y la guía en <Link href="/cuenta/pedidos">Mis compras</Link>.</p>
      </>
    ),
  },
  devoluciones: {
    title: 'Cambios y devoluciones',
    description: 'Política de devoluciones de los productos comprados en Plaza.',
    body: (
      <>
        <p>Tienes derecho a devolver un producto que llegue dañado, incompleto o distinto a lo publicado. Escríbenos con tu número de pedido y fotos del producto.</p>
        <h2>Productos en buen estado</h2>
        <p>Algunas tiendas aceptan devoluciones por cambio de opinión; consulta la descripción del producto o pregunta a la tienda antes de comprar.</p>
        <h2>Reembolsos</h2>
        <p>Los reembolsos se hacen al mismo medio de pago. El tiempo de acreditación depende de tu banco (normalmente de 5 a 10 días hábiles).</p>
      </>
    ),
  },
};

export const LEGAL: Record<string, Page> = {
  terminos: {
    title: 'Términos y condiciones',
    description: `Condiciones de uso de ${APP_NAME} para compradores y vendedores.`,
    body: (
      <>
        <p>{APP_NAME} es un marketplace que conecta a personas compradoras con tiendas independientes. Cada tienda es responsable de los productos que publica, su descripción, existencias y envío.</p>
        <h2>Cuenta</h2>
        <p>Debes ser mayor de edad y proporcionar información verídica. Eres responsable de mantener segura tu contraseña. Una misma cuenta puede comprar y vender.</p>
        <h2>Compras</h2>
        <p>Los precios incluyen IVA y se muestran en pesos mexicanos. Un pedido se confirma cuando el proveedor de pagos aprueba el cobro. Los pedidos no pagados en 60 minutos se cancelan automáticamente.</p>
        <h2>Reseñas</h2>
        <p>Solo pueden reseñar quienes compraron y recibieron el producto. Retiramos reseñas ofensivas, falsas o que incluyan datos personales.</p>
        <h2>Contenido prohibido</h2>
        <p>Está prohibido publicar productos ilegales, falsificados, peligrosos o que infrinjan derechos de terceros. Podemos suspender publicaciones y cuentas que incumplan estas reglas.</p>
        <h2>Contacto</h2>
        <p>Para cualquier aclaración puedes acudir también a la Procuraduría Federal del Consumidor (PROFECO).</p>
      </>
    ),
  },
  privacidad: {
    title: 'Aviso de privacidad',
    description: `Cómo ${APP_NAME} trata tus datos personales.`,
    body: (
      <>
        <p>{APP_NAME} es responsable del tratamiento de tus datos personales conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares.</p>
        <h2>Datos que recabamos</h2>
        <p>Nombre, correo electrónico, teléfono, direcciones de entrega y el historial de tus compras y ventas. No almacenamos datos de tarjetas: los pagos los procesan Stripe o Mercado Pago.</p>
        <h2>Finalidades</h2>
        <ul><li>Crear y administrar tu cuenta.</li><li>Procesar pedidos, pagos, envíos y reembolsos.</li><li>Prevenir fraudes y cumplir obligaciones legales.</li></ul>
        <h2>Con quién compartimos</h2>
        <p>Con la tienda que te vende, solo los datos necesarios para enviar tu pedido (nombre, teléfono y dirección de entrega), y con los proveedores de pago y correo electrónico que operan el servicio.</p>
        <h2>Derechos ARCO</h2>
        <p>Puedes acceder, rectificar, cancelar u oponerte al uso de tus datos escribiendo a nuestro correo de soporte.</p>
      </>
    ),
  },
  vendedores: {
    title: 'Términos para vendedores',
    description: `Reglas y comisiones para vender en ${APP_NAME}.`,
    body: (
      <>
        <h2>Publicaciones</h2>
        <p>Publica solo productos que tengas disponibles, con fotos reales y descripciones exactas. Mantén tu inventario actualizado.</p>
        <h2>Comisiones</h2>
        <p>{APP_NAME} cobra una comisión sobre el valor de los productos de cada venta (el envío no paga comisión). Consulta las tasas vigentes en <Link href="/ayuda/comisiones">Comisiones</Link>.</p>
        <h2>Pedidos y envíos</h2>
        <p>Debes preparar los pedidos pagados en el tiempo que indicas y registrar la paquetería y el número de guía al enviarlos.</p>
        <h2>Pagos a vendedores</h2>
        <p>El dinero de cada venta queda retenido hasta que el pedido se entrega. Las liquidaciones a tu cuenta bancaria se habilitarán cuando completes tus datos fiscales (RFC) y la verificación de identidad.</p>
        <h2>Suspensión</h2>
        <p>Podemos suspender tiendas o publicaciones que incumplan estas reglas, acumulen reportes justificados o pongan en riesgo a los compradores.</p>
      </>
    ),
  },
};
