import { LedgerEntryLineInput } from './ledger-entry-line.input';

export interface RecordLedgerTransactionInput {
  entryId: string;
  entryType: string;
  postedAt: string;
  entries: LedgerEntryLineInput[];
}
