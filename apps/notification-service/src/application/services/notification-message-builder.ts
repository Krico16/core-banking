export interface NotificationMessage {
  subjectId: string;
  message: string;
}

/**
 * Mapea un evento de dominio (eventType + data del envelope) a una notificación
 * humana. Devuelve null para eventTypes que este servicio no notifica — el
 * consumidor los ignora sin registrar processed_events (evita hinchar la tabla
 * con eventos que nunca generan una notificación).
 *
 * Sin motor de plantillas (YAGNI): es un switch simple. Si hace falta
 * personalización real (i18n, HTML, etc.) más adelante, se puede introducir sin
 * romper la interfaz de NotificationSender.
 */
export function buildNotificationMessage(
  eventType: string,
  data: Record<string, unknown>,
): NotificationMessage | null {
  switch (eventType) {
    case 'PaymentCompleted': {
      const paymentId = data.paymentId as string;
      const amount = data.amount as number;
      const currency = data.currency as string;
      return {
        subjectId: paymentId,
        message: `Payment ${paymentId} completed: ${(amount / 100).toFixed(2)} ${currency}`,
      };
    }

    case 'PaymentRejected': {
      const paymentId = data.paymentId as string;
      const reason = (data.reason as string) || 'unknown reason';
      return {
        subjectId: paymentId,
        message: `Payment ${paymentId} rejected: ${reason}`,
      };
    }

    case 'AccountOpened': {
      const customerId = data.customerId as string;
      const accountNumber = data.accountNumber as string;
      return {
        subjectId: customerId,
        message: `Account ${accountNumber} opened`,
      };
    }

    case 'CustomerSuspended': {
      const customerId = data.customerId as string;
      const reason = (data.reason as string) || 'unspecified reason';
      return {
        subjectId: customerId,
        message: `Your account access has been suspended: ${reason}`,
      };
    }

    default:
      return null;
  }
}
