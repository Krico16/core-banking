export interface UpsertPaymentViewInput {
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
