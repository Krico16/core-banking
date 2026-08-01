import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AccountViewOrmEntity } from './persistence/entities/account-view.orm-entity';
import { TransactionViewOrmEntity } from './persistence/entities/transaction-view.orm-entity';
import { PaymentViewOrmEntity } from './persistence/entities/payment-view.orm-entity';
import { CustomerDashboardOrmEntity } from './persistence/entities/customer-dashboard.orm-entity';
import { ProcessedEventOrmEntity } from './persistence/entities/processed-event.orm-entity';
import { AccountViewRepositoryImpl } from './persistence/repositories/account-view.repository.impl';
import { TransactionViewRepositoryImpl } from './persistence/repositories/transaction-view.repository.impl';
import { PaymentViewRepositoryImpl } from './persistence/repositories/payment-view.repository.impl';
import { CustomerDashboardRepositoryImpl } from './persistence/repositories/customer-dashboard.repository.impl';
import { CustomerEventConsumer } from './messaging/customer-event-consumer';
import { AccountEventConsumer } from './messaging/account-event-consumer';
import { LedgerEventConsumer } from './messaging/ledger-event-consumer';
import { PaymentEventConsumer } from './messaging/payment-event-consumer';
import {
  RecordCustomerRegisteredUseCase,
  RecordAccountOpenedUseCase,
  UpdateAccountBalanceUseCase,
  RecordLedgerTransactionUseCase,
  ReverseLedgerTransactionUseCase,
  UpsertPaymentViewUseCase,
  GetAccountViewUseCase,
  GetPaymentViewUseCase,
  GetCustomerDashboardUseCase,
} from '../application/use-cases';
import { ACCOUNT_VIEW_REPOSITORY } from '../domain/ports/account-view-repository.port';
import { TRANSACTION_VIEW_REPOSITORY } from '../domain/ports/transaction-view-repository.port';
import { PAYMENT_VIEW_REPOSITORY } from '../domain/ports/payment-view-repository.port';
import { CUSTOMER_DASHBOARD_REPOSITORY } from '../domain/ports/customer-dashboard-repository.port';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountViewOrmEntity,
      TransactionViewOrmEntity,
      PaymentViewOrmEntity,
      CustomerDashboardOrmEntity,
      ProcessedEventOrmEntity,
    ]),
    LoggerModule,
  ],
  providers: [
    RecordCustomerRegisteredUseCase,
    RecordAccountOpenedUseCase,
    UpdateAccountBalanceUseCase,
    RecordLedgerTransactionUseCase,
    ReverseLedgerTransactionUseCase,
    UpsertPaymentViewUseCase,
    GetAccountViewUseCase,
    GetPaymentViewUseCase,
    GetCustomerDashboardUseCase,
    CustomerEventConsumer,
    AccountEventConsumer,
    LedgerEventConsumer,
    PaymentEventConsumer,
    { provide: ACCOUNT_VIEW_REPOSITORY, useClass: AccountViewRepositoryImpl },
    { provide: TRANSACTION_VIEW_REPOSITORY, useClass: TransactionViewRepositoryImpl },
    { provide: PAYMENT_VIEW_REPOSITORY, useClass: PaymentViewRepositoryImpl },
    { provide: CUSTOMER_DASHBOARD_REPOSITORY, useClass: CustomerDashboardRepositoryImpl },
  ],
  exports: [
    ACCOUNT_VIEW_REPOSITORY,
    TRANSACTION_VIEW_REPOSITORY,
    PAYMENT_VIEW_REPOSITORY,
    CUSTOMER_DASHBOARD_REPOSITORY,
    GetAccountViewUseCase,
    GetPaymentViewUseCase,
    GetCustomerDashboardUseCase,
  ],
})
export class InfrastructureModule {}
