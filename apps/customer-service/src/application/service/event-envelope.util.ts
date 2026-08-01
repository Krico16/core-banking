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

const PRODUCER = 'customer-service';
const EVENT_VERSION = 1;

export function buildEventEnvelope(params: {
  eventType: string;
  subjectId: string;
  data: Record<string, unknown>;
  correlationId?: string;
  causationId?: string;
}): EventEnvelope {
  const eventId = ulid();
  return {
    eventId,
    eventType: params.eventType,
    eventVersion: EVENT_VERSION,
    occurredAt: new Date().toISOString(),
    producer: PRODUCER,
    correlationId: params.correlationId ?? eventId,
    causationId: params.causationId ?? eventId,
    subjectId: params.subjectId,
    data: params.data,
  };
}
