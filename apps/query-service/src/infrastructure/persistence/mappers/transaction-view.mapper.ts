import {
  TransactionView,
  TransactionDirection,
  TransactionViewStatus,
} from '../../../domain/entities/transaction-view.entity';
import { TransactionViewOrmEntity } from '../entities/transaction-view.orm-entity';

export class TransactionViewMapper {
  static toPersistence(view: TransactionView): TransactionViewOrmEntity {
    const orm = new TransactionViewOrmEntity();
    orm.id = view.id;
    orm.entryId = view.entryId;
    orm.accountId = view.accountId;
    orm.counterpartAccountId = view.counterpartAccountId;
    orm.direction = view.direction;
    orm.amount = view.amount;
    orm.currency = view.currency;
    orm.entryType = view.entryType;
    orm.status = view.status;
    orm.postedAt = view.postedAt;
    return orm;
  }

  static toDomain(orm: TransactionViewOrmEntity): TransactionView {
    return TransactionView.reconstruct({
      id: orm.id,
      entryId: orm.entryId,
      accountId: orm.accountId,
      counterpartAccountId: orm.counterpartAccountId,
      direction: orm.direction as TransactionDirection,
      amount: Number(orm.amount),
      currency: orm.currency,
      entryType: orm.entryType,
      status: orm.status as TransactionViewStatus,
      postedAt: orm.postedAt,
    });
  }
}
