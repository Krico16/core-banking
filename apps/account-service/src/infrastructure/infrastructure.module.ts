import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AccountOrmEntity } from './persistence/entities/account.orm-entity';
import { OutboxEventOrmEntity } from './persistence/entities/outbox-event.orm-entity';
import { ProcessedEventOrmEntity } from './persistence/entities/processed-event.orm-entity';
import { CustomerProjectionOrmEntity } from './persistence/entities/customer-projection.orm-entity';
import { AccountRepositoryImpl } from './persistence/repositories/account.repository.impl';
import { OutboxEventRepositoryImpl } from './persistence/repositories/outbox-event.repository.impl';
import { CustomerVerificationRepositoryImpl } from './persistence/repositories/customer-verification.repository.impl';
import { TypeOrmTransactionRunner } from './persistence/transaction-runner.impl';
import { KafkaEventPublisher } from './messaging/kafka-event-publisher';
import { OutboxPublisherWorker } from './messaging/outbox-publisher.worker';
import { CustomerEventConsumer } from './messaging/customer-event-consumer';
import { ACCOUNT_REPOSITORY } from '../domain/ports/account-repository.port';
import { OUTBOX_EVENT_REPOSITORY } from '../domain/ports/outbox-event-repository.port';
import { TRANSACTION_RUNNER } from '../domain/ports/transaction-runner.port';
import { CUSTOMER_VERIFICATION_REPOSITORY } from '../domain/ports/customer-verification-repository.port';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountOrmEntity,
      OutboxEventOrmEntity,
      ProcessedEventOrmEntity,
      CustomerProjectionOrmEntity,
    ]),
    LoggerModule,
  ],
  providers: [
    KafkaEventPublisher,
    OutboxPublisherWorker,
    CustomerEventConsumer,
    { provide: ACCOUNT_REPOSITORY, useClass: AccountRepositoryImpl },
    { provide: OUTBOX_EVENT_REPOSITORY, useClass: OutboxEventRepositoryImpl },
    { provide: TRANSACTION_RUNNER, useClass: TypeOrmTransactionRunner },
    { provide: CUSTOMER_VERIFICATION_REPOSITORY, useClass: CustomerVerificationRepositoryImpl },
  ],
  exports: [
    ACCOUNT_REPOSITORY,
    OUTBOX_EVENT_REPOSITORY,
    TRANSACTION_RUNNER,
    CUSTOMER_VERIFICATION_REPOSITORY,
  ],
})
export class InfrastructureModule {}
