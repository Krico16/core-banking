import { ulid } from 'ulidx';

export type OutboxEventStatus = 'PENDING' | 'PUBLISHED' | 'FAILED';

const MAX_ERROR_LENGTH = 1000;

export class OutboxEvent {
  private constructor(
    readonly id: string,
    readonly aggregateId: string,
    readonly eventType: string,
    readonly payload: string,
    readonly status: OutboxEventStatus,
    readonly retryCount: number,
    readonly createdAt: Date,
    readonly publishedAt: Date | null,
    readonly error: string | null,
  ) {}

  static pending(aggregateId: string, eventType: string, payload: string): OutboxEvent {
    return new OutboxEvent(ulid(), aggregateId, eventType, payload, 'PENDING', 0, new Date(), null, null);
  }

  static reconstruct(props: {
    id: string;
    aggregateId: string;
    eventType: string;
    payload: string;
    status: OutboxEventStatus;
    retryCount: number;
    createdAt: Date;
    publishedAt: Date | null;
    error: string | null;
  }): OutboxEvent {
    return new OutboxEvent(
      props.id, props.aggregateId, props.eventType, props.payload,
      props.status, props.retryCount, props.createdAt, props.publishedAt, props.error,
    );
  }

  markPublished(): OutboxEvent {
    return new OutboxEvent(
      this.id, this.aggregateId, this.eventType, this.payload,
      'PUBLISHED', this.retryCount, this.createdAt, new Date(), null,
    );
  }

  markFailed(error: string, maxRetries: number): OutboxEvent {
    const retryCount = this.retryCount + 1;
    const status: OutboxEventStatus = retryCount >= maxRetries ? 'FAILED' : 'PENDING';
    return new OutboxEvent(
      this.id, this.aggregateId, this.eventType, this.payload,
      status, retryCount, this.createdAt, null, error.slice(0, MAX_ERROR_LENGTH),
    );
  }
}
