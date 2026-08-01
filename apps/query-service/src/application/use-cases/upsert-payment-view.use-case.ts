import { Inject, Injectable } from '@nestjs/common';
import { PaymentView } from '../../domain/entities/payment-view.entity';
import {
  PaymentViewRepository,
  PAYMENT_VIEW_REPOSITORY,
} from '../../domain/ports/payment-view-repository.port';
import { UpsertPaymentViewInput } from '../dto/upsert-payment-view.input';

@Injectable()
export class UpsertPaymentViewUseCase {
  constructor(@Inject(PAYMENT_VIEW_REPOSITORY) private readonly repo: PaymentViewRepository) {}

  async execute(input: UpsertPaymentViewInput): Promise<void> {
    const view = PaymentView.fromSnapshot({
      paymentId: input.paymentId,
      sourceAccountId: input.sourceAccountId,
      targetAccountId: input.targetAccountId,
      amount: input.amount,
      currency: input.currency,
      description: input.description,
      initiatedBy: input.initiatedBy,
      status: input.status,
      ledgerEntryId: input.ledgerEntryId,
      failureReason: input.failureReason,
      createdAt: new Date(input.createdAt),
      updatedAt: new Date(input.updatedAt),
      completedAt: input.completedAt ? new Date(input.completedAt) : null,
      reversedAt: input.reversedAt ? new Date(input.reversedAt) : null,
    });

    await this.repo.save(view);
  }
}
