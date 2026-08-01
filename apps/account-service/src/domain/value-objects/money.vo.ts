import { InvalidMoneyException } from '../exceptions/account-exceptions';

export class Money {
  private constructor(
    readonly amount: number,
    readonly currency: string,
  ) {}

  static fromPlain(amount: number, currency: string): Money {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new InvalidMoneyException(amount, currency);
    }
    if (!currency || currency.length !== 3) {
      throw new InvalidMoneyException(amount, currency);
    }
    return new Money(amount, currency.toUpperCase());
  }

  static zero(currency: string): Money {
    return new Money(0, currency.toUpperCase());
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new InvalidMoneyException(this.amount + other.amount, `${this.currency}+${other.currency}`);
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new InvalidMoneyException(this.amount - other.amount, `${this.currency}-${other.currency}`);
    }
    if (this.amount - other.amount < 0) {
      throw new InvalidMoneyException(this.amount - other.amount, this.currency);
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  isPositive(): boolean { return this.amount > 0; }
  isZero(): boolean { return this.amount === 0; }
  equals(other: Money): boolean { return this.amount === other.amount && this.currency === other.currency; }
  toString(): string { return `${this.amount} ${this.currency}`; }
}
