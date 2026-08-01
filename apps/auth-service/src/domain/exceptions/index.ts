export abstract class DomainException extends Error {
  abstract readonly httpStatusCode: number;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidCredentialsException extends DomainException {
  readonly httpStatusCode = 401;
  constructor(message = 'Invalid credentials') {
    super(message);
  }
}

export class UserAlreadyExistsException extends DomainException {
  readonly httpStatusCode = 409;
  constructor(email: string) {
    super(`User with email '${email}' already exists`);
  }
}

export class UserLockedException extends DomainException {
  readonly httpStatusCode = 423;
  constructor(lockedUntil?: string) {
    super(
      lockedUntil
        ? `Account is locked. Try again after ${lockedUntil}`
        : 'Account is locked',
    );
  }
}

export class UserSuspendedException extends DomainException {
  readonly httpStatusCode = 403;
  constructor(message = 'Account is suspended') {
    super(message);
  }
}

export class UserNotFoundException extends DomainException {
  readonly httpStatusCode = 404;
  constructor(userId?: string) {
    super(userId ? `User '${userId}' not found` : 'User not found');
  }
}

export class InvalidTokenException extends DomainException {
  readonly httpStatusCode = 401;
  constructor(message = 'Invalid or expired token') {
    super(message);
  }
}

export class ValidationException extends DomainException {
  readonly httpStatusCode = 400;
  constructor(message: string) {
    super(message);
  }
}
