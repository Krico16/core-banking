import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AccountView, TransactionView } from '../../domain/entities';
import {
  AccountViewRepository,
  ACCOUNT_VIEW_REPOSITORY,
} from '../../domain/ports/account-view-repository.port';
import {
  TransactionViewRepository,
  TRANSACTION_VIEW_REPOSITORY,
} from '../../domain/ports/transaction-view-repository.port';

@Injectable()
export class GetAccountViewUseCase {
  constructor(
    @Inject(ACCOUNT_VIEW_REPOSITORY) private readonly accountViewRepo: AccountViewRepository,
    @Inject(TRANSACTION_VIEW_REPOSITORY)
    private readonly transactionViewRepo: TransactionViewRepository,
  ) {}

  async byId(accountId: string): Promise<AccountView> {
    const view = await this.accountViewRepo.findById(accountId);
    if (!view) throw new NotFoundException(`Account view not found: ${accountId}`);
    return view;
  }

  async transactionsByAccountId(accountId: string): Promise<TransactionView[]> {
    return this.transactionViewRepo.findByAccountId(accountId);
  }
}
