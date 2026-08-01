export enum CurrencyValue {
  EUR = 'EUR',
  USD = 'USD',
  GBP = 'GBP',
  CHF = 'CHF',
  JPY = 'JPY',
  MXN = 'MXN',
  COP = 'COP',
  ARS = 'ARS',
  CLP = 'CLP',
  BRL = 'BRL',
  PEN = 'PEN',
}

const SUPPORTED = new Set(Object.values(CurrencyValue));

export class Currency {
  private constructor(readonly value: string) {}

  static readonly EUR = new Currency(CurrencyValue.EUR);
  static readonly USD = new Currency(CurrencyValue.USD);
  static readonly GBP = new Currency(CurrencyValue.GBP);
  static readonly CHF = new Currency(CurrencyValue.CHF);
  static readonly JPY = new Currency(CurrencyValue.JPY);
  static readonly MXN = new Currency(CurrencyValue.MXN);
  static readonly COP = new Currency(CurrencyValue.COP);
  static readonly ARS = new Currency(CurrencyValue.ARS);
  static readonly CLP = new Currency(CurrencyValue.CLP);
  static readonly BRL = new Currency(CurrencyValue.BRL);
  static readonly PEN = new Currency(CurrencyValue.PEN);

  static supportedCodes(): string[] {
    return [...SUPPORTED];
  }

  static isSupported(value: string): boolean {
    return SUPPORTED.has(value?.toUpperCase() as CurrencyValue);
  }

  static fromPlain(value: string): Currency {
    const normalized = value?.toUpperCase();
    if (!normalized || !SUPPORTED.has(normalized as CurrencyValue)) {
      throw new Error(
        `Unsupported currency: ${value}. Supported: ${[...SUPPORTED].join(', ')}`,
      );
    }
    return new Currency(normalized);
  }

  equals(other: Currency): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
