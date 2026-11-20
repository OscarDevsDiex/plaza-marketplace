export type ProviderId = 'sandbox' | 'stripe' | 'mercadopago';
export type PaymentState = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'refunded' | 'partially_refunded';

export type CheckoutInput = {
  paymentId: string; orderNumber: number; amount: number; currency: string; buyerEmail: string;
  returnUrl: string; cancelUrl: string; webhookUrl: string;
};

/** Estado verificado consultando al proveedor (nunca se confía solo en el cuerpo del webhook). */
export type VerifiedPayment = { paymentId: string; providerPaymentId: string; state: PaymentState; amount: number; currency: string; amountRefunded?: number };

/** Capa de abstracción: agregar un proveedor = implementar esta interfaz y registrarlo en providers.ts. */
export interface PaymentProvider {
  id: ProviderId;
  label: string;
  description: string;
  isConfigured(): boolean;
  createCheckout(input: CheckoutInput): Promise<{ checkoutUrl: string; providerPaymentId?: string }>;
  /** Verifica la firma del webhook. Devuelve el id de evento (para idempotencia) y la referencia a consultar. */
  verifyWebhook(req: Request, rawBody: string): Promise<{ eventId: string; ref: string } | null>;
  /** Consulta el estado real del pago en el proveedor. */
  fetchPayment(ref: string): Promise<VerifiedPayment | null>;
  refund(providerPaymentId: string, amount: number): Promise<{ refundId: string }>;
}
