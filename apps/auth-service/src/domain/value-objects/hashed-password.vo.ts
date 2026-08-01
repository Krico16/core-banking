export class HashedPassword {
  private constructor(private readonly hash: string) {}

  static fromHash(hash: string): HashedPassword {
    if (!hash || hash.length === 0) {
      throw new Error('Hash cannot be empty');
    }
    return new HashedPassword(hash);
  }

  toString(): string {
    return this.hash;
  }
}
