import { Account } from '../../domain/entities';

export interface AccountResponse {
  id: string;
  customerId: string;
  accountNumber: string;
  accountType: string;
  currency: string;
  balance: { amount: number; currency: string };
  status: string;
  dailyLimit: { amount: number; currency: string };
  transactionLimit: { amount: number; currency: string };
  version: number;
}

export function toAccountResponse(account: Account): AccountResponse {
  return {
    id: account.id.toString(),
    customerId: account.customerId,
    accountNumber: account.accountNumber.toString(),
    accountType: account.accountType.toString(),
    currency: account.currency,
    balance: { amount: account.balance.amount, currency: account.balance.currency },
    status: account.status.toString(),
    dailyLimit: { amount: account.dailyLimit.amount, currency: account.dailyLimit.currency },
    transactionLimit: { amount: account.transactionLimit.amount, currency: account.transactionLimit.currency },
    version: account.version,
  };
}
