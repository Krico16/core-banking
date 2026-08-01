import { ValidationException } from '../exceptions';

export class LastName {
  private constructor(private readonly value: string) {}

  static create(input: string): LastName {
    const trimmed = input?.trim();
    if (!trimmed || trimmed.length === 0) {
      throw new ValidationException('Last name is required');
    }
    if (trimmed.length > 100) {
      throw new ValidationException('Last name must be at most 100 characters');
    }
    return new LastName(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: LastName): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
