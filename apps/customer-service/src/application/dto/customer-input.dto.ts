export class RegisterCustomerInput {
  constructor(
    readonly userId: string,
    readonly email: string,
    readonly firstName: string,
    readonly lastName: string,
    readonly phoneNumber?: string,
    readonly country?: string,
  ) {}
}

export class UpdateCustomerInput {
  constructor(
    readonly id: string,
    readonly email?: string,
    readonly firstName?: string,
    readonly lastName?: string,
    readonly phoneNumber?: string,
    readonly street?: string,
    readonly city?: string,
    readonly country?: string,
    readonly postalCode?: string,
  ) {}
}
