export enum RoleEnum {
  CUSTOMER = 'customer',
  SUPPORT = 'support',
  AUDITOR = 'auditor',
  RISK_ANALYST = 'risk-analyst',
  ADMINISTRATOR = 'administrator',
  SERVICE_ACCOUNT = 'service-account',
}

const VALID_ROLES: ReadonlySet<string> = new Set(Object.values(RoleEnum));

export class Role {
  private constructor(private readonly value: RoleEnum) {}

  static fromString(role: string): Role {
    if (!VALID_ROLES.has(role)) {
      throw new Error(`Invalid role: ${role}`);
    }
    return new Role(role as RoleEnum);
  }

  static CUSTOMER = new Role(RoleEnum.CUSTOMER);
  static SUPPORT = new Role(RoleEnum.SUPPORT);
  static AUDITOR = new Role(RoleEnum.AUDITOR);
  static RISK_ANALYST = new Role(RoleEnum.RISK_ANALYST);
  static ADMINISTRATOR = new Role(RoleEnum.ADMINISTRATOR);
  static SERVICE_ACCOUNT = new Role(RoleEnum.SERVICE_ACCOUNT);

  getValue(): RoleEnum {
    return this.value;
  }

  equals(other: Role): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

export function roleToStringArray(roles: Role[]): string[] {
  return roles.map((r) => r.getValue());
}

export function rolesFromStringArray(roles: string[]): Role[] {
  return roles.map((r) => Role.fromString(r));
}
