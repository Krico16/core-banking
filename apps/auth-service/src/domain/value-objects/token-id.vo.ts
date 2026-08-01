import { ValidationException } from '../exceptions';

export class TokenId {
  private constructor(private readonly value: string) {}

  static create(id: string): TokenId {
    if (!id || id.length !== 26) {
      throw new ValidationException('Token ID must be a 26-character ULID');
    }
    return new TokenId(id);
  }

  getValue(): string {
    return this.value;
  }

  equals(other: TokenId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
