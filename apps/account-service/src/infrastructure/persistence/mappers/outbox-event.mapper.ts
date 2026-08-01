import { OutboxEvent } from '../../../domain/entities/outbox-event.entity';
import { OutboxEventOrmEntity } from '../entities/outbox-event.orm-entity';

export class OutboxEventMapper {
  static toPersistence(event: OutboxEvent): OutboxEventOrmEntity {
    const orm = new OutboxEventOrmEntity();
    orm.id = event.id;
    orm.aggregateId = event.aggregateId;
    orm.eventType = event.eventType;
    orm.payload = event.payload;
    orm.status = event.status;
    orm.retryCount = event.retryCount;
    orm.createdAt = event.createdAt;
    orm.publishedAt = event.publishedAt;
    orm.error = event.error;
    return orm;
  }
}
