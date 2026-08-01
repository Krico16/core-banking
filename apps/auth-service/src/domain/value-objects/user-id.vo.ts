import { ValidationException } from '../exceptions';

export class UserId {
  private constructor(private readonly value: string) {}

  static create(id: string): UserId {
    if (!id || id.length !== 26) {
      throw new ValidationException('User ID must be a 26-character ULID');
    }
    return new UserId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
