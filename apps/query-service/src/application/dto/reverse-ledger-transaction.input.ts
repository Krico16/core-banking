import { LedgerEntryLineInput } from './ledger-entry-line.input';

export interface ReverseLedgerTransactionInput {
  originalEntryId: string;
  reversalEntryId: string;
  reversedAt: string;
  entries: LedgerEntryLineInput[];
}
