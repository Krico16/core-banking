export interface CreatePaymentInput {
  idempotencyKey: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  currency: string;
  description?: string;
  initiatedBy: string;
}

export interface PaymentResponse {
  id: string;
  idempotencyKey: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: number;
  currency: string;
  description?: string;
  initiatedBy: string;
  status: string;
  ledgerEntryId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  reversedAt?: Date;
}

export function toPaymentResponse(payment: any): PaymentResponse {
  return {
    id: payment.id,
    idempotencyKey: payment.idempotencyKey,
    sourceAccountId: payment.sourceAccountId,
    targetAccountId: payment.targetAccountId,
    amount: payment.amount.amount,
    currency: payment.amount.currency,
    description: payment.description,
    initiatedBy: payment.initiatedBy,
    status: payment.status,
    ledgerEntryId: payment.ledgerEntryId,
    failureReason: payment.failureReason,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
    completedAt: payment.completedAt,
    reversedAt: payment.reversedAt,
  };
}
