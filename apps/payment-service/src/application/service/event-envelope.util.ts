import { ulid } from 'ulidx';
import { Payment } from '../../domain/entities';

export interface EventEnvelope {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  correlationId: string;
  causationId: string;
  subjectId: string;
  data: Record<string, unknown>;
}

const PRODUCER = 'payment-service';
const EVENT_VERSION = 1;

/** Builds the standard envelope for a payment domain event, matching the shape the
 * old KafkaEventPublisher.extractData() produced (kept identical across event types). */
export function buildPaymentEventEnvelope(
  eventType: string,
  payment: Payment,
  extra?: Record<string, unknown>,
): EventEnvelope {
  return {
    eventId: ulid(),
    eventType,
    eventVersion: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    producer: PRODUCER,
    correlationId: payment.id,
    causationId: payment.id,
    subjectId: payment.id,
    data: {
      paymentId: payment.id,
      idempotencyKey: payment.idempotencyKey,
      sourceAccountId: payment.sourceAccountId,
      targetAccountId: payment.targetAccountId,
      amount: payment.amount.amount,
      currency: payment.amount.currency,
      description: payment.description,
      initiatedBy: payment.initiatedBy,
      status: payment.status,
      ledgerEntryId: payment.ledgerEntryId,
      failureReason: payment.failureReason,
      createdAt: payment.createdAt.toISOString(),
      updatedAt: payment.updatedAt.toISOString(),
      completedAt: payment.completedAt?.toISOString(),
      reversedAt: payment.reversedAt?.toISOString(),
      ...extra,
    },
  };
}
