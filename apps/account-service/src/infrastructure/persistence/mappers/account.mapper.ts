import { AccountOrmEntity } from '../entities/account.orm-entity';
import { Account } from '../../../domain/entities/account.entity';
import {
  AccountId, AccountNumber, Money, AccountType, AccountStatus,
} from '../../../domain/value-objects';

export class AccountMapper {
  static toDomain(orm: AccountOrmEntity): Account {
    return Account.reconstruct({
      id: AccountId.fromPlain(orm.id),
      customerId: orm.customerId,
      accountNumber: AccountNumber.fromPlain(orm.accountNumber),
      accountType: AccountType.fromPlain(orm.accountType),
      currency: orm.currency,
      balance: Money.fromPlain(Number(orm.balanceAmount), orm.balanceCurrency),
      status: AccountStatus.fromPlain(orm.status),
      dailyLimit: Money.fromPlain(Number(orm.dailyLimitAmount), orm.dailyLimitCurrency),
      transactionLimit: Money.fromPlain(Number(orm.transactionLimitAmount), orm.transactionLimitCurrency),
      version: orm.version,
    });
  }

  static toPersistence(domain: Account): Partial<AccountOrmEntity> {
    return {
      id: domain.id.value,
      customerId: domain.customerId,
      accountNumber: domain.accountNumber.value,
      accountType: domain.accountType.value,
      currency: domain.currency,
      balanceAmount: domain.balance.amount,
      balanceCurrency: domain.balance.currency,
      status: domain.status.value,
      dailyLimitAmount: domain.dailyLimit.amount,
      dailyLimitCurrency: domain.dailyLimit.currency,
      transactionLimitAmount: domain.transactionLimit.amount,
      transactionLimitCurrency: domain.transactionLimit.currency,
      version: domain.version,
    };
  }
}
