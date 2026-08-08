import { trace } from '@opentelemetry/api';
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

/** correlationId/causationId are sourced from the active OTel span (traceId/spanId)
 * so the envelope itself carries real trace context across the outbox/Kafka boundary
 * (see infrastructure/observability/trace-context.util.ts) — falls back to the
 * payment id only if no span is active (should not happen once instrumented). */
function activeTraceIds(): { traceId: string; spanId: string } | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext ? { traceId: spanContext.traceId, spanId: spanContext.spanId } : undefined;
}

/** Builds the standard envelope for a payment domain event, matching the shape the
 * old KafkaEventPublisher.extractData() produced (kept identical across event types). */
export function buildPaymentEventEnvelope(
  eventType: string,
  payment: Payment,
  extra?: Record<string, unknown>,
): EventEnvelope {
  const active = activeTraceIds();
  return {
    eventId: ulid(),
    eventType,
    eventVersion: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    producer: PRODUCER,
    correlationId: active?.traceId ?? payment.id,
    causationId: active?.spanId ?? payment.id,
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
