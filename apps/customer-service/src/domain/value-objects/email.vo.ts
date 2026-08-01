import { InvalidEmailException } from '../exceptions/customer-exceptions';

export class Email {
  private constructor(readonly value: string) {}

  static fromPlain(value: string): Email {
    const normalized = value.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      throw new InvalidEmailException(value);
    }
    return new Email(normalized);
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }
  toString(): string {
    return this.value;
  }
}
