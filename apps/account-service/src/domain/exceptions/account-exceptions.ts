import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';

export class InvalidAccountIdException extends BadRequestException {
  constructor(value: string) {
    super(`Invalid account ID: ${value}`);
  }
}

export class InvalidAccountNumberException extends BadRequestException {
  constructor(value: string) {
    super(`Invalid account number: ${value}`);
  }
}

export class InvalidMoneyException extends BadRequestException {
  constructor(amount: number, currency: string) {
    super(`Invalid money: ${amount} ${currency}`);
  }
}

export class AccountNotFoundException extends NotFoundException {
  constructor(id: string) {
    super(`Account not found: ${id}`);
  }
}

export class DuplicateAccountException extends ConflictException {
  constructor() {
    super('Account number already exists');
  }
}

export class AccountFrozenException extends BadRequestException {
  constructor() {
    super('Account is frozen');
  }
}

export class AccountClosedException extends BadRequestException {
  constructor() {
    super('Account is closed');
  }
}

export class CustomerNotVerifiedException extends BadRequestException {
  constructor(customerId: string) {
    super(`Customer not verified, cannot open account: ${customerId}`);
  }
}
