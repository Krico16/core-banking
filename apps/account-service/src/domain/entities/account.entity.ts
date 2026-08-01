import { AccountId, AccountNumber, Money, AccountType, AccountStatus } from '../value-objects';

export class Account {
  private constructor(
    readonly id: AccountId,
    readonly customerId: string,
    private _accountNumber: AccountNumber,
    private _accountType: AccountType,
    private _currency: string,
    private _balance: Money,
    private _status: AccountStatus,
    private _dailyLimit: Money,
    private _transactionLimit: Money,
    readonly version: number,
  ) {}

  static open(props: {
    customerId: string;
    accountType: AccountType;
    currency: string;
    dailyLimit: Money;
    transactionLimit: Money;
  }): Account {
    return new Account(
      AccountId.generate(),
      props.customerId,
      AccountNumber.generate(props.currency.substring(0, 2)),
      props.accountType,
      props.currency,
      Money.zero(props.currency),
      AccountStatus.ACTIVE,
      props.dailyLimit,
      props.transactionLimit,
      0,
    );
  }

  static reconstruct(props: {
    id: AccountId;
    customerId: string;
    accountNumber: AccountNumber;
    accountType: AccountType;
    currency: string;
    balance: Money;
    status: AccountStatus;
    dailyLimit: Money;
    transactionLimit: Money;
    version: number;
  }): Account {
    return new Account(
      props.id,
      props.customerId,
      props.accountNumber,
      props.accountType,
      props.currency,
      props.balance,
      props.status,
      props.dailyLimit,
      props.transactionLimit,
      props.version,
    );
  }

  get accountNumber(): AccountNumber { return this._accountNumber; }
  get accountType(): AccountType { return this._accountType; }
  get currency(): string { return this._currency; }
  get balance(): Money { return this._balance; }
  get status(): AccountStatus { return this._status; }
  get dailyLimit(): Money { return this._dailyLimit; }
  get transactionLimit(): Money { return this._transactionLimit; }

  isActive(): boolean { return this._status.equals(AccountStatus.ACTIVE); }
  isFrozen(): boolean { return this._status.equals(AccountStatus.FROZEN); }
  isClosed(): boolean { return this._status.equals(AccountStatus.CLOSED); }

  freeze(): void {
    if (this.isClosed()) throw new Error('Cannot freeze a closed account');
    this._status = AccountStatus.FROZEN;
  }

  unfreeze(): void {
    if (this.isClosed()) throw new Error('Cannot unfreeze a closed account');
    this._status = AccountStatus.ACTIVE;
  }

  close(): void {
    if (!this._balance.isZero()) throw new Error('Cannot close account with non-zero balance');
    this._status = AccountStatus.CLOSED;
  }

  credit(amount: Money): void {
    if (this.isClosed()) throw new Error('Cannot credit a closed account');
    if (this.isFrozen()) throw new Error('Cannot credit a frozen account');
    if (amount.currency !== this._currency) throw new Error('Currency mismatch');
    this._balance = this._balance.add(amount);
  }

  debit(amount: Money): void {
    if (this.isClosed()) throw new Error('Cannot debit a closed account');
    if (this.isFrozen()) throw new Error('Cannot debit a frozen account');
    if (amount.currency !== this._currency) throw new Error('Currency mismatch');
    this._balance = this._balance.subtract(amount);
  }
}
