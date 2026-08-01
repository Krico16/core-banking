import { CustomerId, Email, Address, KycStatus, CustomerStatus, Country } from '../value-objects';

export class Customer {
  private constructor(
    readonly id: CustomerId,
    readonly userId: string,
    private _email: Email,
    private _firstName: string,
    private _lastName: string,
    private _phoneNumber: string,
    private _address: Address,
    private _kycStatus: KycStatus,
    private _status: CustomerStatus,
    private _riskLevel: string,
    readonly version: number,
  ) {}

  static register(props: {
    userId: string;
    email: Email;
    firstName: string;
    lastName: string;
    phoneNumber?: string;
    country?: string;
  }): Customer {
    return new Customer(
      CustomerId.generate(),
      props.userId,
      props.email,
      props.firstName,
      props.lastName,
      props.phoneNumber || '',
      Address.fromPlain('', '', props.country || '', ''),
      KycStatus.PENDING,
      CustomerStatus.ACTIVE,
      'LOW',
      0,
    );
  }

  static reconstruct(props: {
    id: CustomerId;
    userId: string;
    email: Email;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    street: string;
    city: string;
    country: string;
    postalCode: string;
    kycStatus: KycStatus;
    status: CustomerStatus;
    riskLevel: string;
    version: number;
  }): Customer {
    return new Customer(
      props.id,
      props.userId,
      props.email,
      props.firstName,
      props.lastName,
      props.phoneNumber,
      Address.fromPlain(props.street, props.city, props.country, props.postalCode),
      props.kycStatus,
      props.status,
      props.riskLevel,
      props.version,
    );
  }

  get email(): Email { return this._email; }
  get firstName(): string { return this._firstName; }
  get lastName(): string { return this._lastName; }
  get phoneNumber(): string { return this._phoneNumber; }
  get address(): Address { return this._address; }
  get kycStatus(): KycStatus { return this._kycStatus; }
  get status(): CustomerStatus { return this._status; }
  get riskLevel(): string { return this._riskLevel; }

  isActive(): boolean { return this._status.equals(CustomerStatus.ACTIVE); }
  isSuspended(): boolean { return this._status.equals(CustomerStatus.SUSPENDED); }
  isKycVerified(): boolean { return this._kycStatus.equals(KycStatus.VERIFIED); }

  updatedFields: string[] = [];

  updateEmail(email: Email): void {
    if (!this._email.equals(email)) { this._email = email; this.updatedFields.push('email'); }
  }
  updateFirstName(name: string): void {
    if (name && this._firstName !== name) { this._firstName = name; this.updatedFields.push('firstName'); }
  }
  updateLastName(name: string): void {
    if (name && this._lastName !== name) { this._lastName = name; this.updatedFields.push('lastName'); }
  }
  updatePhone(phone: string): void {
    if (phone !== undefined && this._phoneNumber !== phone) { this._phoneNumber = phone; this.updatedFields.push('phoneNumber'); }
  }
  updateAddress(address: Address): void {
    this._address = address; this.updatedFields.push('address');
  }

  verifyKyc(): void {
    this._kycStatus = KycStatus.VERIFIED;
  }

  suspend(): void {
    this._status = CustomerStatus.SUSPENDED;
  }

  reactivate(): void {
    this._status = CustomerStatus.ACTIVE;
  }
}
