export enum KycStatusValue {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export class KycStatus {
  private readonly validValues = Object.values(KycStatusValue);

  private constructor(readonly value: string) {}

  static PENDING = new KycStatus(KycStatusValue.PENDING);
  static VERIFIED = new KycStatus(KycStatusValue.VERIFIED);
  static REJECTED = new KycStatus(KycStatusValue.REJECTED);

  static fromPlain(value: string): KycStatus {
    const normalized = value?.toUpperCase();
    for (const instance of [this.PENDING, this.VERIFIED, this.REJECTED]) {
      if (instance.value === normalized) return instance;
    }
    return KycStatus.PENDING;
  }

  equals(other: KycStatus): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
