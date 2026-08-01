import { Module } from '@nestjs/common';
import { CreatePaymentUseCase, AdvancePaymentUseCase, ReversePaymentUseCase, GetPaymentUseCase } from './use-cases';
import { PaymentSagaOrchestrator } from './saga/payment-saga.orchestrator';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { LedgerEventConsumer } from '../infrastructure/messaging/ledger-event-consumer';
import { RiskEventConsumer } from '../infrastructure/messaging/risk-event-consumer';

@Module({
  imports: [InfrastructureModule],
  providers: [
    CreatePaymentUseCase,
    AdvancePaymentUseCase,
    ReversePaymentUseCase,
    GetPaymentUseCase,
    PaymentSagaOrchestrator,
    LedgerEventConsumer,
    RiskEventConsumer,
  ],
  exports: [
    CreatePaymentUseCase,
    AdvancePaymentUseCase,
    ReversePaymentUseCase,
    GetPaymentUseCase,
  ],
})
export class ApplicationModule {}
