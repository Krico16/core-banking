import { Inject, Injectable, Logger } from '@nestjs/common';
import { Payment, OutboxEvent } from '../../domain/entities';
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
import { LedgerOperationException } from '../../infrastructure/http/ledger-http.client';
import { buildPaymentEventEnvelope } from '../service/event-envelope.util';

/**
 * Saga orchestrator (ADR-006).
 *
 * Ejecuta los pasos de la transferencia de forma asíncrona e idempotente:
 * CREATED → VALIDATING → RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED
 *                                                      ↘ FAILED
 *
 * `run()` solo llega hasta RISK_REVIEW: publica PaymentRiskEvaluationRequested y se
 * detiene ahí. El resto del flujo (AUTHORIZED → POSTING → COMPLETED, o FAILED por
 * rechazo de riesgo) lo dispara RiskEventConsumer al recibir la respuesta async de
 * risk-service (PaymentApprovedByRisk / PaymentRejectedByRisk).
 *
 * Cada paso verifica el estado actual antes de actuar, por lo que
 * re-ejecutar la saga sobre un pago ya avanzado es seguro.
 */
@Injectable()
export class PaymentSagaOrchestrator {
  private readonly logger = new Logger(PaymentSagaOrchestrator.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    @Inject(LEDGER_CLIENT) private readonly ledger: LedgerClient,
  ) {}

  /** Lanza la saga sin bloquear la respuesta HTTP. */
  start(paymentId: string): void {
    setImmediate(() => {
      this.run(paymentId).catch((err) =>
        this.logger.error(`Saga crashed for payment ${paymentId}`, err),
      );
    });
  }

  async run(paymentId: string): Promise<void> {
    let payment = await this.repo.findById(paymentId);
    if (!payment) return;

    try {
      payment = await this.stepValidating(payment);
      payment = await this.stepRiskReview(payment);
    } catch (error) {
      await this.handleFailure(payment, error);
    }
  }

  /** Llamado por RiskEventConsumer al recibir PaymentApprovedByRisk. */
  async resumeAfterRiskApproval(paymentId: string): Promise<void> {
    let payment = await this.repo.findById(paymentId);
    if (!payment) return;
    if (payment.status !== PaymentStatus.RISK_REVIEW) {
      this.logger.debug(`Payment ${paymentId} not in RISK_REVIEW (status=${payment.status}), ignoring approval`);
      return;
    }

    try {
      payment = await this.stepAuthorize(payment);
      payment = await this.stepPostToLedger(payment);
    } catch (error) {
      await this.handleFailure(payment, error);
    }
  }

  /** Llamado por RiskEventConsumer al recibir PaymentRejectedByRisk. */
  async handleRiskRejection(paymentId: string, reason: string): Promise<void> {
    const payment = await this.repo.findById(paymentId);
    if (!payment) return;
    if (payment.status !== PaymentStatus.RISK_REVIEW) {
      this.logger.debug(`Payment ${paymentId} not in RISK_REVIEW (status=${payment.status}), ignoring rejection`);
      return;
    }

    payment.transitionTo(PaymentStatus.FAILED, reason);

    const envelope = buildPaymentEventEnvelope('PaymentRejected', payment, { reason });
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentRejected', JSON.stringify(envelope)),
        ctx,
      );
    });

    this.logger.warn(`Payment ${payment.id} → FAILED (${reason}, rejected by risk-service)`);
  }

  private async stepValidating(payment: Payment): Promise<Payment> {
    if (payment.status !== PaymentStatus.CREATED) return payment;
    payment.transitionTo(PaymentStatus.VALIDATING);
    await this.repo.save(payment);
    this.logger.log(`Payment ${payment.id} → VALIDATING`);
    return payment;
  }

  private async stepRiskReview(payment: Payment): Promise<Payment> {
    if (payment.status !== PaymentStatus.VALIDATING) return payment;
    payment.transitionTo(PaymentStatus.RISK_REVIEW);

    const envelope = buildPaymentEventEnvelope('PaymentRiskEvaluationRequested', payment, {
      requestedAt: new Date().toISOString(),
    });
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentRiskEvaluationRequested', JSON.stringify(envelope)),
        ctx,
      );
    });

    this.logger.log(`Payment ${payment.id} → RISK_REVIEW (awaiting risk-service)`);
    return payment;
  }

  private async stepAuthorize(payment: Payment): Promise<Payment> {
    if (payment.status !== PaymentStatus.RISK_REVIEW) return payment;
    payment.transitionTo(PaymentStatus.AUTHORIZED);

    const envelope = buildPaymentEventEnvelope('PaymentAuthorized', payment);
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentAuthorized', JSON.stringify(envelope)),
        ctx,
      );
    });

    this.logger.log(`Payment ${payment.id} → AUTHORIZED`);
    return payment;
  }

  private async stepPostToLedger(payment: Payment): Promise<Payment> {
    if (payment.status !== PaymentStatus.AUTHORIZED) return payment;

    payment.transitionTo(PaymentStatus.POSTING);
    await this.repo.save(payment);
    this.logger.log(`Payment ${payment.id} → POSTING (calling ledger)`);

    const result = await this.ledger.transfer({
      sourceAccountId: payment.sourceAccountId,
      targetAccountId: payment.targetAccountId,
      amount: payment.amount.amount,
      currency: payment.amount.currency,
      idempotencyKey: `ledger-${payment.id}`,
      description: payment.description || `Payment ${payment.id}`,
      paymentId: payment.id,
    });

    payment.setLedgerEntryId(result.journalEntryId);
    payment.transitionTo(PaymentStatus.COMPLETED);

    const envelope = buildPaymentEventEnvelope('PaymentCompleted', payment);
    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentCompleted', JSON.stringify(envelope)),
        ctx,
      );
    });

    this.logger.log(`Payment ${payment.id} → COMPLETED (entry ${result.journalEntryId})`);
    return payment;
  }

  private async handleFailure(payment: Payment, error: unknown): Promise<void> {
    if (
      payment.status === PaymentStatus.COMPLETED ||
      payment.status === PaymentStatus.FAILED ||
      payment.status === PaymentStatus.REVERSED
    ) {
      return;
    }

    const reason =
      error instanceof LedgerOperationException ? error.reason : 'SAGA_INTERNAL_ERROR';

    try {
      payment.transitionTo(PaymentStatus.FAILED, reason);

      const envelope = buildPaymentEventEnvelope('PaymentFailed', payment, { reason });
      await this.txRunner.run(async (ctx) => {
        await this.repo.save(payment, ctx);
        await this.outbox.save(
          OutboxEvent.pending(payment.id, 'PaymentFailed', JSON.stringify(envelope)),
          ctx,
        );
      });

      this.logger.warn(`Payment ${payment.id} → FAILED (${reason})`);
    } catch (saveError) {
      this.logger.error(`Failed to persist FAILED state for payment ${payment.id}`, saveError);
    }
  }
}
