import { ValidationException } from '../exceptions';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Email {
  private constructor(private readonly value: string) {}

  static create(input: string): Email {
    const normalized = input.trim().toLowerCase();
    if (!normalized || normalized.length > 255) {
      throw new ValidationException('Email must be between 1 and 255 characters');
    }
    if (!EMAIL_REGEX.test(normalized)) {
      throw new ValidationException('Invalid email format');
    }
    return new Email(normalized);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
