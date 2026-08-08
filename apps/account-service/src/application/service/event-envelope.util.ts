import { trace } from '@opentelemetry/api';
import { ulid } from 'ulidx';

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

const PRODUCER = 'account-service';
const EVENT_VERSION = 1;

/** correlationId/causationId default to the active OTel span (traceId/spanId) so the
 * envelope carries real trace context across the outbox/Kafka boundary (see
 * infrastructure/observability/trace-context.util.ts); an explicit param still wins,
 * and eventId is the last-resort fallback if no span is active. */
function activeTraceIds(): { traceId: string; spanId: string } | undefined {
  const spanContext = trace.getActiveSpan()?.spanContext();
  return spanContext ? { traceId: spanContext.traceId, spanId: spanContext.spanId } : undefined;
}

export function buildEventEnvelope(params: {
  eventType: string;
  subjectId: string;
  data: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
}): EventEnvelope {
  const eventId = ulid();
  const active = activeTraceIds();
  return {
    eventId,
    eventType: params.eventType,
    eventVersion: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    producer: PRODUCER,
    correlationId: params.correlationId ?? active?.traceId ?? eventId,
    causationId: params.causationId ?? active?.spanId ?? eventId,
    subjectId: params.subjectId,
    data: params.data,
  };
}
