import { Inject, Injectable } from '@nestjs/common';
import { ulid } from 'ulidx';
import { Payment } from '../../domain/entities';
import { Money } from '../../domain/value-objects';
import {
  PAYMENT_REPOSITORY,
  PaymentRepository,
  OUTBOX_EVENT_REPOSITORY,
  OutboxEventRepository,
  TRANSACTION_RUNNER,
  TransactionRunner,
} from '../../domain/ports';
import { OutboxEvent } from '../../domain/entities';
import { InvalidPaymentException } from '../../domain/exceptions/payment-exceptions';
import { PaymentSagaOrchestrator } from '../saga/payment-saga.orchestrator';
import { CreatePaymentInput, PaymentResponse, toPaymentResponse } from '../dto';
import { buildPaymentEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class CreatePaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    private readonly saga: PaymentSagaOrchestrator,
  ) {}

  async execute(input: CreatePaymentInput): Promise<PaymentResponse> {
    if (input.sourceAccountId === input.targetAccountId) {
      throw new InvalidPaymentException('Source and target accounts must be different');
    }
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new InvalidPaymentException('Amount must be a positive integer (cents)');
    }
    if (!input.currency || input.currency.length !== 3) {
      throw new InvalidPaymentException('Currency must be a 3-letter ISO code');
    }

    // Idempotencia: misma clave → mismo resultado, sin re-ejecutar la saga
    const existing = await this.repo.findByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return toPaymentResponse(existing);
    }

    const payment = Payment.create({
      id: `pay_${ulid()}`,
      idempotencyKey: input.idempotencyKey,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      amount: Money.fromPlain(input.amount, input.currency),
      description: input.description,
      initiatedBy: input.initiatedBy,
    });

    const envelope = buildPaymentEventEnvelope('PaymentCreated', payment);

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(payment, ctx);
      await this.outbox.save(
        OutboxEvent.pending(payment.id, 'PaymentCreated', JSON.stringify(envelope)),
        ctx,
      );
    });

    // La saga corre asíncrona; el cliente consulta el estado con GET /payments/:id
    this.saga.start(payment.id);

    return toPaymentResponse(payment);
  }
}
