import { InvalidCustomerIdException } from '../exceptions/customer-exceptions';
import { ulid } from 'ulidx';

export class CustomerId {
  private constructor(readonly value: string) {}

  static generate(): CustomerId {
    return new CustomerId(ulid());
  }

  static fromPlain(value: string): CustomerId {
    if (!value || value.length < 10) throw new InvalidCustomerIdException(value);
    return new CustomerId(value);
  }

  equals(other: CustomerId): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
