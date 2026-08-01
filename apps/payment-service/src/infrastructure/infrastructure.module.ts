import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentOrmEntity } from './persistence/entities/payment.orm-entity';
import { ProcessedEventOrmEntity } from './persistence/entities/processed-event.orm-entity';
import { OutboxEventOrmEntity } from './persistence/entities/outbox-event.orm-entity';
import { PaymentRepositoryImpl } from './persistence/repositories/payment.repository';
import { OutboxEventRepositoryImpl } from './persistence/repositories/outbox-event.repository.impl';
import { TypeOrmTransactionRunner } from './persistence/transaction-runner.impl';
import { KafkaEventPublisher } from './messaging/kafka-event-publisher';
import { OutboxPublisherWorker } from './messaging/outbox-publisher.worker';
import { LedgerHttpClient } from './http/ledger-http.client';
import {
  PAYMENT_REPOSITORY,
  LEDGER_CLIENT,
  OUTBOX_EVENT_REPOSITORY,
  TRANSACTION_RUNNER,
} from '../domain/ports';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentOrmEntity, ProcessedEventOrmEntity, OutboxEventOrmEntity]),
  ],
  providers: [
    KafkaEventPublisher,
    OutboxPublisherWorker,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PaymentRepositoryImpl,
    },
    {
      provide: OUTBOX_EVENT_REPOSITORY,
      useClass: OutboxEventRepositoryImpl,
    },
    {
      provide: TRANSACTION_RUNNER,
      useClass: TypeOrmTransactionRunner,
    },
    {
      provide: LEDGER_CLIENT,
      useClass: LedgerHttpClient,
    },
  ],
  exports: [PAYMENT_REPOSITORY, OUTBOX_EVENT_REPOSITORY, TRANSACTION_RUNNER, LEDGER_CLIENT, TypeOrmModule],
})
export class InfrastructureModule {}
