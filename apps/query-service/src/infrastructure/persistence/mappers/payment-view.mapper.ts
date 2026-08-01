import { PaymentView } from '../../../domain/entities/payment-view.entity';
import { PaymentViewOrmEntity } from '../entities/payment-view.orm-entity';

export class PaymentViewMapper {
  static toPersistence(view: PaymentView): PaymentViewOrmEntity {
    const orm = new PaymentViewOrmEntity();
    orm.paymentId = view.paymentId;
    orm.sourceAccountId = view.sourceAccountId;
    orm.targetAccountId = view.targetAccountId;
    orm.amount = view.amount;
    orm.currency = view.currency;
    orm.description = view.description;
    orm.initiatedBy = view.initiatedBy;
    orm.status = view.status;
    orm.ledgerEntryId = view.ledgerEntryId;
    orm.failureReason = view.failureReason;
    orm.createdAt = view.createdAt;
    orm.updatedAt = view.updatedAt;
    orm.completedAt = view.completedAt;
    orm.reversedAt = view.reversedAt;
    return orm;
  }

  static toDomain(orm: PaymentViewOrmEntity): PaymentView {
    return PaymentView.fromSnapshot({
      paymentId: orm.paymentId,
      sourceAccountId: orm.sourceAccountId,
      targetAccountId: orm.targetAccountId,
      amount: Number(orm.amount),
      currency: orm.currency,
      description: orm.description,
      initiatedBy: orm.initiatedBy,
      status: orm.status,
      ledgerEntryId: orm.ledgerEntryId,
      failureReason: orm.failureReason,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      completedAt: orm.completedAt,
      reversedAt: orm.reversedAt,
    });
  }
}
