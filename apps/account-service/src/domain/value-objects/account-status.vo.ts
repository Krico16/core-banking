export enum AccountStatusValue {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export class AccountStatus {
  private constructor(readonly value: string) {}

  static PENDING = new AccountStatus(AccountStatusValue.PENDING);
  static ACTIVE = new AccountStatus(AccountStatusValue.ACTIVE);
  static FROZEN = new AccountStatus(AccountStatusValue.FROZEN);
  static CLOSED = new AccountStatus(AccountStatusValue.CLOSED);

  static fromPlain(value: string): AccountStatus {
    const normalized = value?.toUpperCase();
    for (const instance of [this.PENDING, this.ACTIVE, this.FROZEN, this.CLOSED]) {
      if (instance.value === normalized) return instance;
    }
    return AccountStatus.PENDING;
  }

  equals(other: AccountStatus): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
