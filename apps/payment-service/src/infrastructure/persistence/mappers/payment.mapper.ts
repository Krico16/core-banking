import { Payment } from '../../../domain/entities';
import { Money, PaymentStatus } from '../../../domain/value-objects';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';

export class PaymentMapper {
  static toDomain(orm: PaymentOrmEntity): Payment {
    return Payment.reconstruct({
      id: orm.id,
      idempotencyKey: orm.idempotencyKey,
      sourceAccountId: orm.sourceAccountId,
      targetAccountId: orm.targetAccountId,
      amount: Money.fromPlain(Number(orm.amountCents), orm.amountCurrency),
      description: orm.description,
      initiatedBy: orm.initiatedBy,
      status: orm.status as PaymentStatus,
      ledgerEntryId: orm.ledgerEntryId,
      failureReason: orm.failureReason,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      completedAt: orm.completedAt,
      reversedAt: orm.reversedAt,
    });
  }

  static toOrm(domain: Payment): PaymentOrmEntity {
    const orm = new PaymentOrmEntity();
    orm.id = domain.id;
    orm.idempotencyKey = domain.idempotencyKey;
    orm.sourceAccountId = domain.sourceAccountId;
    orm.targetAccountId = domain.targetAccountId;
    orm.amountCents = domain.amount.amount;
    orm.amountCurrency = domain.amount.currency;
    orm.description = domain.description;
    orm.initiatedBy = domain.initiatedBy;
    orm.status = domain.status;
    orm.ledgerEntryId = domain.ledgerEntryId;
    orm.failureReason = domain.failureReason;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    orm.completedAt = domain.completedAt;
    orm.reversedAt = domain.reversedAt;
    return orm;
  }
}
