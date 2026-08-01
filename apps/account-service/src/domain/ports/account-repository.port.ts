import { Account } from '../entities/account.entity';
import { AccountId } from '../value-objects/account-id.vo';
import { TransactionContext } from './transaction-runner.port';

export interface AccountRepository {
  findById(id: AccountId): Promise<Account | null>;
  findByCustomerId(customerId: string): Promise<Account[]>;
  save(account: Account, ctx?: TransactionContext): Promise<void>;
}

export const ACCOUNT_REPOSITORY = Symbol('ACCOUNT_REPOSITORY');
