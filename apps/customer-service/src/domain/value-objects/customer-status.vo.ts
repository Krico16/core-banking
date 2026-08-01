export enum CustomerStatusValue {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
}

export class CustomerStatus {
  private constructor(readonly value: string) {}

  static PENDING = new CustomerStatus(CustomerStatusValue.PENDING);
  static ACTIVE = new CustomerStatus(CustomerStatusValue.ACTIVE);
  static SUSPENDED = new CustomerStatus(CustomerStatusValue.SUSPENDED);
  static CLOSED = new CustomerStatus(CustomerStatusValue.CLOSED);

  static fromPlain(value: string): CustomerStatus {
    const normalized = value?.toUpperCase();
    for (const instance of [this.PENDING, this.ACTIVE, this.SUSPENDED, this.CLOSED]) {
      if (instance.value === normalized) return instance;
    }
    return CustomerStatus.PENDING;
  }

  equals(other: CustomerStatus): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
