import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { CustomerOrmEntity } from './persistence/entities/customer.orm-entity';
import { OutboxEventOrmEntity } from './persistence/entities/outbox-event.orm-entity';
import { CustomerRepositoryImpl } from './persistence/repositories/customer.repository.impl';
import { OutboxEventRepositoryImpl } from './persistence/repositories/outbox-event.repository.impl';
import { TypeOrmTransactionRunner } from './persistence/transaction-runner.impl';
import { KafkaEventPublisher } from './messaging/kafka-event-publisher';
import { OutboxPublisherWorker } from './messaging/outbox-publisher.worker';
import { CUSTOMER_REPOSITORY } from '../domain/ports/customer-repository.port';
import { OUTBOX_EVENT_REPOSITORY } from '../domain/ports/outbox-event-repository.port';
import { TRANSACTION_RUNNER } from '../domain/ports/transaction-runner.port';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([CustomerOrmEntity, OutboxEventOrmEntity]), LoggerModule],
  providers: [
    KafkaEventPublisher,
    OutboxPublisherWorker,
    { provide: CUSTOMER_REPOSITORY, useClass: CustomerRepositoryImpl },
    { provide: OUTBOX_EVENT_REPOSITORY, useClass: OutboxEventRepositoryImpl },
    { provide: TRANSACTION_RUNNER, useClass: TypeOrmTransactionRunner },
  ],
  exports: [CUSTOMER_REPOSITORY, OUTBOX_EVENT_REPOSITORY, TRANSACTION_RUNNER],
})
export class InfrastructureModule {}
