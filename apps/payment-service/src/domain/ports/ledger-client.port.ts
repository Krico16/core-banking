export const LEDGER_CLIENT = Symbol('LEDGER_CLIENT');

export interface LedgerTransferResult {
  journalEntryId: string;
  transactionId: string;
  status: string;
}

export interface LedgerClient {
  transfer(params: {
    sourceAccountId: string;
    targetAccountId: string;
    amount: number;
    currency: string;
    idempotencyKey: string;
    description?: string;
    paymentId?: string;
  }): Promise<LedgerTransferResult>;

  reverse(params: {
    originalEntryId: string;
    idempotencyKey: string;
    reason: string;
  }): Promise<LedgerTransferResult>;
}
