import {
  User,
  UserId,
  Email,
  HashedPassword,
  FirstName,
  LastName,
  UserStatus,
  rolesFromStringArray,
} from '../../../../domain';
import { UserOrmEntity } from '../entities';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstruct({
      id: UserId.create(orm.id),
      email: Email.create(orm.email),
      passwordHash: HashedPassword.fromHash(orm.passwordHash),
      firstName: FirstName.create(orm.firstName),
      lastName: LastName.create(orm.lastName),
      roles: rolesFromStringArray(orm.roles),
      status: UserStatus.fromString(orm.status),
      emailVerified: orm.emailVerified,
      failedLoginAttempts: orm.failedLoginAttempts,
      lockedUntil: orm.lockedUntil,
      version: orm.version,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toPersistence(user: User): UserOrmEntity {
    const orm = new UserOrmEntity();
    orm.id = user.id.getValue();
    orm.email = user.email.getValue();
    orm.passwordHash = user.passwordHash.toString();
    orm.firstName = user.firstName.getValue();
    orm.lastName = user.lastName.getValue();
    orm.roles = user.roleNames;
    orm.status = user.status.getValue();
    orm.emailVerified = user.emailVerified;
    orm.failedLoginAttempts = user.failedLoginAttempts;
    orm.lockedUntil = user.lockedUntil;
    orm.version = user.version;
    return orm;
  }

  static toPersistencePartial(
    user: User,
  ): Partial<UserOrmEntity> {
    return {
      id: user.id.getValue(),
      email: user.email.getValue(),
      passwordHash: user.passwordHash.toString(),
      firstName: user.firstName.getValue(),
      lastName: user.lastName.getValue(),
      roles: user.roleNames,
      status: user.status.getValue(),
      emailVerified: user.emailVerified,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
      version: user.version,
    };
  }
}
