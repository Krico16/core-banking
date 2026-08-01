import { Controller, Get, Param } from '@nestjs/common';
import { GetPaymentViewUseCase } from '../../application/use-cases/get-payment-view.use-case';

interface PaymentViewResponse {
  paymentId: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  currency: string;
  description: string | null;
  initiatedBy: string;
  status: string;
  ledgerEntryId: string | null;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  reversedAt: string | null;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly getPaymentView: GetPaymentViewUseCase) {}

  @Get(':paymentId')
  async byId(@Param('paymentId') paymentId: string): Promise<PaymentViewResponse> {
    const view = await this.getPaymentView.byId(paymentId);
    return {
      paymentId: view.paymentId,
      sourceAccountId: view.sourceAccountId,
      targetAccountId: view.targetAccountId,
      amount: view.amount,
      currency: view.currency,
      description: view.description,
      initiatedBy: view.initiatedBy,
      status: view.status,
      ledgerEntryId: view.ledgerEntryId,
      failureReason: view.failureReason,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
      completedAt: view.completedAt ? view.completedAt.toISOString() : null,
      reversedAt: view.reversedAt ? view.reversedAt.toISOString() : null,
    };
  }
}
