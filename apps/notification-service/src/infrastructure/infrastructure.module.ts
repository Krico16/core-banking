import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { NotificationOrmEntity } from './persistence/entities/notification.orm-entity';
import { ProcessedEventOrmEntity } from './persistence/entities/processed-event.orm-entity';
import { NotificationRepositoryImpl } from './persistence/repositories/notification.repository.impl';
import { LogNotificationSender } from './notification/log-notification-sender';
import { PaymentEventConsumer } from './messaging/payment-event-consumer';
import { AccountEventConsumer } from './messaging/account-event-consumer';
import { CustomerEventConsumer } from './messaging/customer-event-consumer';
import { NotifyCustomerUseCase } from '../application/use-cases/notify-customer.use-case';
import { NOTIFICATION_REPOSITORY } from '../domain/ports/notification-repository.port';
import { NOTIFICATION_SENDER } from '../domain/ports/notification-sender.port';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([NotificationOrmEntity, ProcessedEventOrmEntity]),
    LoggerModule,
  ],
  providers: [
    NotifyCustomerUseCase,
    PaymentEventConsumer,
    AccountEventConsumer,
    CustomerEventConsumer,
    { provide: NOTIFICATION_REPOSITORY, useClass: NotificationRepositoryImpl },
    { provide: NOTIFICATION_SENDER, useClass: LogNotificationSender },
  ],
  exports: [NOTIFICATION_REPOSITORY, NOTIFICATION_SENDER],
})
export class InfrastructureModule {}
