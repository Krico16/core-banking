import { Inject, Injectable } from '@nestjs/common';
import { Payment, OutboxEvent } from '../../domain/entities';
import { PaymentStatus } from '../../domain/value-objects';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
  OUTBOX_EVENT_REPOSITORY,
  OutboxEventRepository,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '../../domain/ports';
import { PaymentNotFoundException, PaymentAlreadyProcessedException } from '../../domain/exceptions/payment-exceptions';
import { PaymentResponse, toPaymentResponse } from '../dto';
import { buildPaymentEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class AdvancePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
  ) {}

  /**
   * Avanza al siguiente estado. Pensado para depuración en desarrollo;
   * la saga automática es el camino normal.
   */
  async advance(paymentId: string): Promise<PaymentResponse> {
    const payment = await this.loadActive(paymentId);

    const nextStatus = this.getNextStatus(payment.status);
    if (!nextStatus) {
      throw new PaymentAlreadyProcessedException(paymentId);
    }

    payment.transitionTo(nextStatus);

    if (nextStatus === PaymentStatus.AUTHORIZED) {
      const envelope = buildPaymentEventEnvelope('PaymentAuthorized', payment);
      await this.txRunner.run(async (ctx) => {
        await this.repo.save(payment, ctx);
        await this.outbox.save(
          OutboxEvent.pending(payment.id, 'PaymentAuthorized', JSON.stringify(envelope)),
          ctx,
        );
      });
    } else {
      await this.repo.save(payment);
    }

    return toPaymentResponse(payment);
  }

  private getNextStatus(current: PaymentStatus): PaymentStatus | null {
    const transitions: Record<PaymentStatus, PaymentStatus | null> = {
      [PaymentStatus.CREATED]: PaymentStatus.VALIDATING,
      [PaymentStatus.VALIDATING]: PaymentStatus.RISK_REVIEW,
      [PaymentStatus.RISK_REVIEW]: PaymentStatus.AUTHORIZED,
      [PaymentStatus.AUTHORIZED]: PaymentStatus.POSTING,
      [PaymentStatus.POSTING]: PaymentStatus.COMPLETED,
      [PaymentStatus.COMPLETED]: null,
      [PaymentStatus.FAILED]: null,
      [PaymentStatus.REVERSED]: null,
    };
    return transitions[current];
  }

  /**
   * Completa un pago en POSTING con el asiento del ledger.
   * Idempotente: si ya está COMPLETED con el mismo entry, devuelve el estado actual.
   */
  async complete(paymentId: string, ledgerEntryId: string): Promise<PaymentResponse> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) {
      throw new PaymentNotFoundException(paymentId);
    }

    // Idempotencia: ya completado con el mismo entry → mismo resultado
    if (payment.status === PaymentStatus.COMPLETED) {
      if (payment.ledgerEntryId === ledgerEntryId) {
        return toPaymentResponse(payment);
      }
      throw new PaymentAlreadyProcessedException(paymentId);
    }

    if (payment.status !== PaymentStatus.POSTING) {
      throw new PaymentAlreadyProcessedException(paymentId);
    }

    payment.setLedgerEntryId(ledgerEntryId);
    payment.transitionTo(PaymentStatus.COMPLETED);

    const envelope = buildPaymentEventEnvelope('PaymentCompleted', payment);
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentCompleted', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toPaymentResponse(payment);
  }

  async fail(paymentId: string, reason: string): Promise<PaymentResponse> {
    const payment = await this.loadActive(paymentId);
    payment.transitionTo(PaymentStatus.FAILED, reason);

    const envelope = buildPaymentEventEnvelope('PaymentFailed', payment, { reason });
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentFailed', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toPaymentResponse(payment);
  }

  private async loadActive(paymentId: string): Promise<Payment> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) {
      throw new PaymentNotFoundException(paymentId);
    }
    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REVERSED
    ) {
      throw new PaymentAlreadyProcessedException(paymentId);
    }
    return payment;
  }
}
