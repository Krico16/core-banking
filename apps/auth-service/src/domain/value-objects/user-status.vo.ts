export enum UserStatusEnum {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  LOCKED = 'LOCKED',
  PENDING = 'PENDING',
}

export class UserStatus {
  private constructor(private readonly value: UserStatusEnum) {}

  static ACTIVE = new UserStatus(UserStatusEnum.ACTIVE);
  static SUSPENDED = new UserStatus(UserStatusEnum.SUSPENDED);
  static LOCKED = new UserStatus(UserStatusEnum.LOCKED);
  static PENDING = new UserStatus(UserStatusEnum.PENDING);

  static fromString(status: string): UserStatus {
    const upper = status.toUpperCase();
    switch (upper) {
      case 'ACTIVE':
        return UserStatus.ACTIVE;
      case 'SUSPENDED':
        return UserStatus.SUSPENDED;
      case 'LOCKED':
        return UserStatus.LOCKED;
      case 'PENDING':
        return UserStatus.PENDING;
      default:
        throw new Error(`Invalid user status: ${status}`);
    }
  }

  getValue(): UserStatusEnum {
    return this.value;
  }

  isActive(): boolean {
    return this.value === UserStatusEnum.ACTIVE;
  }

  isSuspended(): boolean {
    return this.value === UserStatusEnum.SUSPENDED;
  }

  isLocked(): boolean {
    return this.value === UserStatusEnum.LOCKED;
  }

  equals(other: UserStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
