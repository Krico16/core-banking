import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

export class InvalidCustomerIdException extends BadRequestException {
  constructor(value: string) { super(`Invalid customer ID: ${value}`); }
}

export class InvalidEmailException extends BadRequestException {
  constructor(value: string) { super(`Invalid email: ${value}`); }
}

export class CustomerNotFoundException extends NotFoundException {
  constructor(id: string) { super(`Customer not found: ${id}`); }
}

export class DuplicateCustomerException extends ConflictException {
  constructor(field: string) { super(`Customer already exists for this ${field}`); }
}

export class KycAlreadyVerifiedException extends BadRequestException {
  constructor() { super('KYC already verified'); }
}

export class CustomerAlreadySuspendedException extends BadRequestException {
  constructor() { super('Customer already suspended'); }
}
