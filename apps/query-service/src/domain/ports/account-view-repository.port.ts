import { AccountView } from '../entities/account-view.entity';

export interface AccountViewRepository {
  save(view: AccountView): Promise<void>;
  findById(accountId: string): Promise<AccountView | null>;
  findByCustomerId(customerId: string): Promise<AccountView[]>;
}

export const ACCOUNT_VIEW_REPOSITORY = Symbol('ACCOUNT_VIEW_REPOSITORY');
