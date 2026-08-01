import { InvalidAccountIdException } from '../exceptions/account-exceptions';
import { ulid } from 'ulidx';

export class AccountId {
  private constructor(readonly value: string) {}

  static generate(): AccountId { return new AccountId(ulid()); }

  static fromPlain(value: string): AccountId {
    if (!value || value.length < 10) throw new InvalidAccountIdException(value);
    return new AccountId(value);
  }

  equals(other: AccountId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
