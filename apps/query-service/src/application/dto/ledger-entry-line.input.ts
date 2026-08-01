export interface LedgerEntryLineInput {
  accountId: string;
  type: 'DEBIT' | 'CREDIT';
  amount: number;
  currency: string;
}
