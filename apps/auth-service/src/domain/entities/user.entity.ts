import {
  UserId,
  Email,
  HashedPassword,
  FirstName,
  LastName,
  Role,
  UserStatus,
  UserStatusEnum,
  roleToStringArray,
} from '../value-objects';

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export class User {
  private constructor(
    readonly id: UserId,
    readonly email: Email,
    readonly passwordHash: HashedPassword,
    readonly firstName: FirstName,
    readonly lastName: LastName,
    readonly roles: Role[],
    private _status: UserStatus,
    readonly emailVerified: boolean,
    private _failedLoginAttempts: number,
    private _lockedUntil: Date | null,
    readonly version: number,
    readonly createdAt: Date,
    readonly updatedAt: Date,
  ) {}

  static create(params: {
    id: UserId;
    email: Email;
    passwordHash: HashedPassword;
    firstName: FirstName;
    lastName: LastName;
    roles: Role[];
  }): User {
    const now = new Date();
    return new User(
      params.id,
      params.email,
      params.passwordHash,
      params.firstName,
      params.lastName,
      params.roles,
      UserStatus.ACTIVE,
      false,
      0,
      null,
      0,
      now,
      now,
    );
  }

  static reconstruct(params: {
    id: UserId;
    email: Email;
    passwordHash: HashedPassword;
    firstName: FirstName;
    lastName: LastName;
    roles: Role[];
    status: UserStatus;
    emailVerified: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    return new User(
      params.id,
      params.email,
      params.passwordHash,
      params.firstName,
      params.lastName,
      params.roles,
      params.status,
      params.emailVerified,
      params.failedLoginAttempts,
      params.lockedUntil,
      params.version,
      params.createdAt,
      params.updatedAt,
    );
  }

  get status(): UserStatus {
    return this._status;
  }

  get statusValue(): UserStatusEnum {
    return this._status.getValue();
  }

  get failedLoginAttempts(): number {
    return this._failedLoginAttempts;
  }

  get lockedUntil(): Date | null {
    return this._lockedUntil;
  }

  get roleNames(): string[] {
    return roleToStringArray(this.roles);
  }

  isActive(): boolean {
    return this._status.isActive();
  }

  isLocked(): boolean {
    if (!this._status.isLocked()) return false;
    if (this._lockedUntil && this._lockedUntil <= new Date()) {
      this._status = UserStatus.ACTIVE;
      this._lockedUntil = null;
      this._failedLoginAttempts = 0;
      return false;
    }
    return true;
  }

  isSuspended(): boolean {
    return this._status.isSuspended();
  }

  hasRole(role: Role): boolean {
    return this.roles.some((r) => r.equals(role));
  }

  registerLoginFailure(): void {
    this._failedLoginAttempts++;
    if (this._failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      this._status = UserStatus.LOCKED;
      this._lockedUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000);
    }
  }

  registerLoginSuccess(): void {
    this._failedLoginAttempts = 0;
    if (this._status.isLocked()) {
      this._status = UserStatus.ACTIVE;
      this._lockedUntil = null;
    }
  }

  suspend(): void {
    this._status = UserStatus.SUSPENDED;
  }

  activate(): void {
    this._status = UserStatus.ACTIVE;
    this._failedLoginAttempts = 0;
    this._lockedUntil = null;
  }

  changePassword(newHash: HashedPassword): void {
    (this as { passwordHash: HashedPassword }).passwordHash = newHash;
  }

  toPlain(): Record<string, unknown> {
    return {
      id: this.id.getValue(),
      email: this.email.getValue(),
      firstName: this.firstName.getValue(),
      lastName: this.lastName.getValue(),
      roles: this.roleNames,
      status: this._status.getValue(),
      emailVerified: this.emailVerified,
      failedLoginAttempts: this._failedLoginAttempts,
      lockedUntil: this._lockedUntil?.toISOString() ?? null,
      version: this.version,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }
}
