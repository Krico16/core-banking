import { Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentStatus } from '../../domain/value-objects';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
  OUTBOX_EVENT_REPOSITORY,
  OutboxEventRepository,
  TRANSACTION_RUNNER,
  TransactionRunner,
  LEDGER_CLIENT,
  LedgerClient,
} from '../../domain/ports';
import { OutboxEvent } from '../../domain/entities';
import { PaymentNotFoundException, PaymentAlreadyProcessedException } from '../../domain/exceptions/payment-exceptions';
import { LedgerOperationException } from '../../infrastructure/http/ledger-http.client';
import { PaymentResponse, toPaymentResponse } from '../dto';
import { buildPaymentEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class ReversePaymentUseCase {
  private readonly logger = new Logger(ReversePaymentUseCase.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    @Inject(LEDGER_CLIENT) private readonly ledger: LedgerClient,
  ) {}

  async execute(paymentId: string, reason?: string): Promise<PaymentResponse> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) {
      throw new PaymentNotFoundException(paymentId);
    }

    // Idempotencia: ya revertido → mismo resultado
    if (payment.status === PaymentStatus.REVERSED) {
      return toPaymentResponse(payment);
    }

    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new PaymentAlreadyProcessedException(paymentId);
    }

    if (!payment.ledgerEntryId) {
      throw new PaymentAlreadyProcessedException(paymentId);
    }

    // Compensación: revertir el asiento en el ledger ANTES de marcar el pago
    const reversalReason = reason || `Reversal of payment ${paymentId}`;
    try {
      await this.ledger.reverse({
        originalEntryId: payment.ledgerEntryId,
        idempotencyKey: `rev-${payment.id}`,
        reason: reversalReason,
      });
    } catch (error) {
      if (error instanceof LedgerOperationException) {
        this.logger.error(
          `Ledger reversal failed for payment ${paymentId}: ${error.detail}`,
        );
        throw new PaymentAlreadyProcessedException(
          `${paymentId} (ledger reversal failed: ${error.reason})`,
        );
      }
      throw error;
    }

    payment.transitionTo(PaymentStatus.REVERSED);

    const envelope = buildPaymentEventEnvelope('PaymentReversed', payment);
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentReversed', JSON.stringify(envelope)),
        ctx,
      );
    });

    this.logger.log(`Payment ${paymentId} reversed: ${reversalReason}`);

    return toPaymentResponse(payment);
  }
}
