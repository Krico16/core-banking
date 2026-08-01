import { ulid } from 'ulidx';

export type TransactionDirection = 'DEBIT' | 'CREDIT';
export type TransactionViewStatus = 'POSTED' | 'REVERSED';

export class TransactionView {
  private constructor(
    readonly id: string,
    readonly entryId: string,
    readonly accountId: string,
    readonly counterpartAccountId: string | null,
    readonly direction: TransactionDirection,
    readonly amount: number,
    readonly currency: string,
    readonly entryType: string,
    readonly status: TransactionViewStatus,
    readonly postedAt: Date,
  ) {}

  static create(props: {
    entryId: string;
    accountId: string;
    counterpartAccountId: string | null;
    direction: TransactionDirection;
    amount: number;
    currency: string;
    entryType: string;
    postedAt: Date;
  }): TransactionView {
    return new TransactionView(
      ulid(),
      props.entryId,
      props.accountId,
      props.counterpartAccountId,
      props.direction,
      props.amount,
      props.currency,
      props.entryType,
      'POSTED',
      props.postedAt,
    );
  }

  static reconstruct(props: {
    id: string;
    entryId: string;
    accountId: string;
    counterpartAccountId: string | null;
    direction: TransactionDirection;
    amount: number;
    currency: string;
    entryType: string;
    status: TransactionViewStatus;
    postedAt: Date;
  }): TransactionView {
    return new TransactionView(
      props.id,
      props.entryId,
      props.accountId,
      props.counterpartAccountId,
      props.direction,
      props.amount,
      props.currency,
      props.entryType,
      props.status,
      props.postedAt,
    );
  }

  markReversed(): TransactionView {
    return new TransactionView(
      this.id,
      this.entryId,
      this.accountId,
      this.counterpartAccountId,
      this.direction,
      this.amount,
      this.currency,
      this.entryType,
      'REVERSED',
      this.postedAt,
    );
  }
}
