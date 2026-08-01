import { Inject, Injectable } from '@nestjs/common';
import { PAYMENT_REPOSITORY, PaymentRepository } from '../../domain/ports';
import { PaymentNotFoundException } from '../../domain/exceptions/payment-exceptions';
import { PaymentResponse, toPaymentResponse } from '../dto';

@Injectable()
export class GetPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly repo: PaymentRepository,
  ) {}

  async byId(id: string): Promise<PaymentResponse> {
    const payment = await this.repo.findById(id);
    if (!payment) {
      throw new PaymentNotFoundException(id);
    }
    return toPaymentResponse(payment);
  }
}
