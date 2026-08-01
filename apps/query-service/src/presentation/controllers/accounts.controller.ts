import { Controller, Get, Param } from '@nestjs/common';
import { GetAccountViewUseCase } from '../../application/use-cases/get-account-view.use-case';

interface AccountViewResponse {
  accountId: string;
  customerId: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: number;
  updatedAt: string;
}

interface TransactionViewResponse {
  id: string;
  entryId: string;
  accountId: string;
  counterpartAccountId: string | null;
  direction: string;
  amount: number;
  currency: string;
  entryType: string;
  status: string;
  postedAt: string;
}

@Controller('accounts')
export class AccountsController {
  constructor(private readonly getAccountView: GetAccountViewUseCase) {}

  @Get(':accountId')
  async byId(@Param('accountId') accountId: string): Promise<AccountViewResponse> {
    const view = await this.getAccountView.byId(accountId);
    return {
      accountId: view.accountId,
      customerId: view.customerId,
      accountNumber: view.accountNumber,
      accountType: view.accountType,
      currency: view.currency,
      balance: view.balance,
      updatedAt: view.updatedAt.toISOString(),
    };
  }

  @Get(':accountId/transactions')
  async transactions(@Param('accountId') accountId: string): Promise<TransactionViewResponse[]> {
    const transactions = await this.getAccountView.transactionsByAccountId(accountId);
    return transactions.map((t) => ({
      id: t.id,
      entryId: t.entryId,
      accountId: t.accountId,
      counterpartAccountId: t.counterpartAccountId,
      direction: t.direction,
      amount: t.amount,
      currency: t.currency,
      entryType: t.entryType,
      status: t.status,
      postedAt: t.postedAt.toISOString(),
    }));
  }
}
