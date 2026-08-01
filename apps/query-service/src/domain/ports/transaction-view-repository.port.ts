import { TransactionView } from '../entities/transaction-view.entity';

export interface TransactionViewRepository {
  save(view: TransactionView): Promise<void>;
  findByEntryId(entryId: string): Promise<TransactionView[]>;
  findByAccountId(accountId: string): Promise<TransactionView[]>;
}

export const TRANSACTION_VIEW_REPOSITORY = Symbol('TRANSACTION_VIEW_REPOSITORY');
