import { ValidationException } from '../exceptions';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;

export class Password {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(raw: string): Password {
    if (!raw || raw.length < 12) {
      throw new ValidationException('Password must be at least 12 characters');
    }
    if (raw.length > 128) {
      throw new ValidationException('Password must be at most 128 characters');
    }
    if (!PASSWORD_REGEX.test(raw)) {
      throw new ValidationException(
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      );
    }
    return new Password(raw);
  }

  getValue(): string {
    return this.value;
  }
}
