/** Etiquetas y opciones del panel de vendedor (compartidas por servidor y cliente). */
type Tone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'dark';

export const CARRIERS = ['Estafeta', 'DHL', 'FedEx', 'Redpack', 'Paquetexpress', '99minutos', 'Correos de México', 'Otra'] as const;

export const ORDER_STATUS: Record<string, { label: string; tone: Tone }> = {
  pending_payment: { label: 'Pago pendiente', tone: 'neutral' },
  paid: { label: 'Pagado', tone: 'brand' },
  processing: { label: 'En preparación', tone: 'warning' },
  shipped: { label: 'Enviado', tone: 'info' },
  delivered: { label: 'Entregado', tone: 'success' },
  cancelled: { label: 'Cancelado', tone: 'neutral' },
  refunded: { label: 'Reembolsado', tone: 'danger' },
};

export const PRODUCT_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'Borrador', tone: 'neutral' },
  active: { label: 'Publicado', tone: 'success' },
  paused: { label: 'Pausado', tone: 'warning' },
  suspended: { label: 'Suspendido', tone: 'danger' },
  archived: { label: 'Archivado', tone: 'dark' },
};

export const CONDITIONS = { new: 'Nuevo', used: 'Usado', refurbished: 'Reacondicionado' } as const;

export const MX_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
  'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
  'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];
