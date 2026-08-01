import { OutboxEvent } from '../entities/outbox-event.entity';
import { TransactionContext } from './transaction-runner.port';

export interface OutboxEventRepository {
  save(event: OutboxEvent, ctx?: TransactionContext): Promise<void>;
}

export const OUTBOX_EVENT_REPOSITORY = Symbol('OUTBOX_EVENT_REPOSITORY');
