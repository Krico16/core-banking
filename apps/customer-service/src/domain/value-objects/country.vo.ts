export class Country {
  private constructor(readonly value: string) {}

  static fromPlain(value: string): Country {
    const normalized = value?.toUpperCase()?.trim();
    return new Country(normalized || '');
  }

  equals(other: Country): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
