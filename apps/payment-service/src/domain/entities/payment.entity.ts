import { Money, PaymentStatus, VALID_TRANSITIONS } from '../value-objects';

export interface PaymentProps {
  id: string;
  idempotencyKey: string;
  sourceAccountId: string;
  targetAccountId: string;
  amount: Money;
  description?: string;
  initiatedBy: string;
  status: PaymentStatus;
  ledgerEntryId?: string;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  reversedAt?: Date;
}

export class Payment {
  private constructor(private props: PaymentProps) {}

  static create(props: Omit<PaymentProps, 'status' | 'createdAt' | 'updatedAt'>): Payment {
    return new Payment({
      ...props,
      status: PaymentStatus.CREATED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstruct(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get id(): string { return this.props.id; }
  get idempotencyKey(): string { return this.props.idempotencyKey; }
  get sourceAccountId(): string { return this.props.sourceAccountId; }
  get targetAccountId(): string { return this.props.targetAccountId; }
  get amount(): Money { return this.props.amount; }
  get description(): string | undefined { return this.props.description; }
  get initiatedBy(): string { return this.props.initiatedBy; }
  get status(): PaymentStatus { return this.props.status; }
  get ledgerEntryId(): string | undefined { return this.props.ledgerEntryId; }
  get failureReason(): string | undefined { return this.props.failureReason; }
  get createdAt(): Date { return this.props.createdAt; }
  get updatedAt(): Date { return this.props.updatedAt; }
  get completedAt(): Date | undefined { return this.props.completedAt; }
  get reversedAt(): Date | undefined { return this.props.reversedAt; }

  transitionTo(newStatus: PaymentStatus, failureReason?: string): void {
    const allowed = VALID_TRANSITIONS[this.props.status];
    if (!allowed.includes(newStatus)) {
      throw new Error(
        `Invalid transition: ${this.props.status} -> ${newStatus}`
      );
    }
    this.props.status = newStatus;
    this.props.updatedAt = new Date();
    if (failureReason) {
      this.props.failureReason = failureReason;
    }
    if (newStatus === PaymentStatus.COMPLETED) {
      this.props.completedAt = new Date();
    }
    if (newStatus === PaymentStatus.REVERSED) {
      this.props.reversedAt = new Date();
    }
  }

  setLedgerEntryId(entryId: string): void {
    this.props.ledgerEntryId = entryId;
    this.props.updatedAt = new Date();
  }

  toProps(): PaymentProps {
    return { ...this.props };
  }
}
