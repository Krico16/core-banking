export enum AccountTypeValue {
  CHECKING = 'CHECKING',
  SAVINGS = 'SAVINGS',
}

export class AccountType {
  private constructor(readonly value: string) {}

  static CHECKING = new AccountType(AccountTypeValue.CHECKING);
  static SAVINGS = new AccountType(AccountTypeValue.SAVINGS);

  static fromPlain(value: string): AccountType {
    const normalized = value?.toUpperCase();
    for (const instance of [this.CHECKING, this.SAVINGS]) {
      if (instance.value === normalized) return instance;
    }
    return AccountType.CHECKING;
  }

  equals(other: AccountType): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
