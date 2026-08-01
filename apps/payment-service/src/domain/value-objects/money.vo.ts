export class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string,
  ) {
    if (!Number.isInteger(amount)) {
      throw new Error('Amount must be in cents (integer)');
    }
    if (!currency || currency.length !== 3) {
      throw new Error('Currency must be 3-letter ISO code');
    }
  }

  static fromPlain(amount: number, currency: string): Money {
    return new Money(amount, currency.toUpperCase());
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  toString(): string {
    return `${this.amount} ${this.currency}`;
  }
}
