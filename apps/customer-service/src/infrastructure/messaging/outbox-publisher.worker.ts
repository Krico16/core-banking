import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { KafkaEventPublisher } from './kafka-event-publisher';
import { withEventTraceContext } from '../observability/trace-context.util';

interface PendingOutboxRow {
  id: string;
  aggregate_id: string;
  event_type: string;
  payload: string;
  retry_count: number;
}

const MAX_RETRIES = 10;
const BATCH_SIZE = 100;
const POLL_INTERVAL_MS = 1000;

@Injectable()
export class OutboxPublisherWorker {
  private readonly logger = new Logger(OutboxPublisherWorker.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly producer: KafkaEventPublisher,
    private readonly config: ConfigService,
  ) {}

  @Interval(POLL_INTERVAL_MS)
  async publishPendingEvents(): Promise<void> {
    const topic =
      this.config.get<string>('redpanda.topicCustomerEvents') || 'banking.customer.events';
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const pending: PendingOutboxRow[] = await queryRunner.manager.query(
        `SELECT id, aggregate_id, event_type, payload, retry_count
         FROM outbox_events
         WHERE status = 'PENDING' AND retry_count < $1
         ORDER BY created_at
         LIMIT $2
         FOR UPDATE SKIP LOCKED`,
        [MAX_RETRIES, BATCH_SIZE],
      );

      for (const row of pending) {
        try {
          const envelope = JSON.parse(row.payload) as {
            correlationId?: string;
            causationId?: string;
          };
          await withEventTraceContext(envelope.correlationId, envelope.causationId, () =>
            this.producer.sendRaw(topic, row.aggregate_id, row.payload),
          );
          await queryRunner.manager.query(
            `UPDATE outbox_events SET status = 'PUBLISHED', published_at = now(), error = NULL WHERE id = $1`,
            [row.id],
          );
        } catch (error) {
          const retryCount = row.retry_count + 1;
          const status = retryCount >= MAX_RETRIES ? 'FAILED' : 'PENDING';
          const message = (error instanceof Error ? error.message : String(error)).slice(0, 1000);
          await queryRunner.manager.query(
            `UPDATE outbox_events SET status = $1, retry_count = $2, error = $3 WHERE id = $4`,
            [status, retryCount, message, row.id],
          );
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error({ err: error }, 'Outbox publisher tick failed');
    } finally {
      await queryRunner.release();
    }
  }
}
