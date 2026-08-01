import { AccountView } from '../../../domain/entities/account-view.entity';
import { AccountViewOrmEntity } from '../entities/account-view.orm-entity';

export class AccountViewMapper {
  static toPersistence(view: AccountView): AccountViewOrmEntity {
    const orm = new AccountViewOrmEntity();
    orm.accountId = view.accountId;
    orm.customerId = view.customerId;
    orm.accountNumber = view.accountNumber;
    orm.accountType = view.accountType;
    orm.currency = view.currency;
    orm.balance = view.balance;
    orm.updatedAt = view.updatedAt;
    return orm;
  }

  static toDomain(orm: AccountViewOrmEntity): AccountView {
    return AccountView.reconstruct({
      accountId: orm.accountId,
      customerId: orm.customerId,
      accountNumber: orm.accountNumber,
      accountType: orm.accountType,
      currency: orm.currency,
      balance: Number(orm.balance),
      updatedAt: orm.updatedAt,
    });
  }
}
