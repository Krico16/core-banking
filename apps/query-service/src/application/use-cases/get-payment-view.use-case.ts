import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PaymentView } from '../../domain/entities/payment-view.entity';
import {
  PaymentViewRepository,
  PAYMENT_VIEW_REPOSITORY,
} from '../../domain/ports/payment-view-repository.port';

@Injectable()
export class GetPaymentViewUseCase {
  constructor(@Inject(PAYMENT_VIEW_REPOSITORY) private readonly repo: PaymentViewRepository) {}

  async byId(paymentId: string): Promise<PaymentView> {
    const view = await this.repo.findById(paymentId);
    if (!view) throw new NotFoundException(`Payment view not found: ${paymentId}`);
    return view;
  }
}
