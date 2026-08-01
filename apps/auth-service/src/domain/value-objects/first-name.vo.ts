import { ValidationException } from '../exceptions';

export class FirstName {
  private constructor(private readonly value: string) {}

  static create(input: string): FirstName {
    const trimmed = input?.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new ValidationException('First name is required');
    }
    if (trimmed.length > 100) {
      throw new ValidationException('First name must be at most 100 characters');
    }
    return new FirstName(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: FirstName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
