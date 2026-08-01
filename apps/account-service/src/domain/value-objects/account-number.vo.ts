import { InvalidAccountNumberException } from '../exceptions/account-exceptions';

export class AccountNumber {
  private constructor(readonly value: string) {}

  static generate(countryCode: string): AccountNumber {
    const digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return new AccountNumber(`${countryCode.toUpperCase()}${digits}`);
  }

  static fromPlain(value: string): AccountNumber {
    if (!value || value.length < 4) throw new InvalidAccountNumberException(value);
    return new AccountNumber(value.toUpperCase());
  }

  equals(other: AccountNumber): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
