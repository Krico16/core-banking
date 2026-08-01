export class Address {
  private constructor(
    readonly street: string,
    readonly city: string,
    readonly country: string,
    readonly postalCode: string,
  ) {}

  static fromPlain(street: string, city: string, country: string, postalCode: string): Address {
    return new Address(street || '', city || '', country || '', postalCode || '');
  }

  toString(): string { return `${this.street}, ${this.city}, ${this.country} ${this.postalCode}`.trim(); }
}
