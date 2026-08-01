# Guía de Arquitectura Hexagonal (Ports & Adapters)

Estándar obligatorio para todos los servicios del core bancario.

## Filosofía

El dominio es el corazón. La infraestructura es un detalle. Esta arquitectura garantiza que:

- El dominio **no depende** de frameworks, ORMs, ni protocolos de red
- Los casos de uso **orquestan** el dominio inyectando puertos (interfaces)
- Los adaptadores **implementan** los puertos con tecnologías concretas
- La presentación **expone** los casos de uso al mundo exterior

## Estructura de carpetas

```
src/
├── domain/                        # 🔵 Capa de dominio — cero dependencias
│   ├── entities/                   # Agregados y entidades de negocio
│   │   └── user.entity.ts
│   ├── value-objects/              # Objetos inmutables con validación
│   │   ├── email.vo.ts
│   │   ├── money.vo.ts
│   │   └── index.ts
│   ├── ports/                      # Contratos (interfaces)
│   │   ├── user-repository.port.ts
│   │   ├── event-publisher.port.ts
│   │   └── index.ts
│   ├── events/                     # Eventos de dominio (puros)
│   │   ├── user-registered.event.ts
│   │   └── index.ts
│   └── exceptions/                 # Errores de dominio tipados
│       ├── user-not-found.exception.ts
│       ├── duplicate-email.exception.ts
│       └── index.ts
│
├── application/                    # 🟢 Capa de aplicación
│   ├── use-cases/                  # Un caso de uso por clase
│   │   ├── register.use-case.ts
│   │   ├── login.use-case.ts
│   │   └── index.ts
│   └── dto/                        # DTOs de entrada/salida
│       ├── register.dto.ts
│       └── index.ts
│
├── infrastructure/                 # 🟠 Capa de infraestructura (adapters)
│   ├── persistence/
│   │   ├── entities/               # TypeORM entities (separadas del dominio)
│   │   │   └── user.orm-entity.ts
│   │   ├── mappers/                # ORM ↔ Domain
│   │   │   └── user.mapper.ts
│   │   └── repositories/           # Implementaciones de puertos
│   │       └── user.repository.impl.ts
│   ├── messaging/                  # Kafka / Redpanda
│   │   └── kafka-event-publisher.ts
│   ├── auth/                       # Hashing, JWT
│   │   └── argon2-password-hasher.ts
│   └── config/                     # Configuración NestJS
│       └── database.config.ts
│
├── presentation/                   # 🔴 Capa de presentación
│   ├── controllers/
│   │   └── auth.controller.ts
│   ├── guards/
│   │   └── jwt-auth.guard.ts
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   └── decorators/
│       └── current-user.decorator.ts
│
├── main.ts
└── app.module.ts
```

## Patrón de entidad de dominio

```typescript
// domain/entities/user.entity.ts
import { UserId } from '../value-objects/user-id.vo';
import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';
import { UserStatus } from '../value-objects/user-status.vo';

export class User {
  private constructor(
    readonly id: UserId,
    readonly email: Email,
    private _passwordHash: HashedPassword,
    private _status: UserStatus,
    private _failedAttempts: number,
    private _lockedUntil: Date | null,
    readonly version: number,
  ) {}

  // Factory: crear nueva entidad (ID autogenerado)
  static create(email: Email, passwordHash: HashedPassword): User {
    return new User(UserId.generate(), email, passwordHash, UserStatus.ACTIVE, 0, null, 0);
  }

  // Factory: reconstruir desde BD (con ID y versión conocidos)
  static reconstruct(props: ReconstructProps): User {
    return new User(props.id, props.email, props.passwordHash, props.status, props.failedAttempts, props.lockedUntil, props.version);
  }

  // Comportamiento (métodos de negocio)
  registerLoginFailure(): void {
    this._failedAttempts++;
    if (this._failedAttempts >= 5) {
      this._status = UserStatus.LOCKED;
      this._lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    }
  }

  registerLoginSuccess(): void {
    this._failedAttempts = 0;
    this._lockedUntil = null;
    this._status = UserStatus.ACTIVE;
  }

  isActive(): boolean { return this._status === UserStatus.ACTIVE; }
  isLocked(): boolean { return !!(this._lockedUntil && this._lockedUntil > new Date()); }
}
```

## Patrón de Value Object

```typescript
// domain/value-objects/email.vo.ts
import { InvalidEmailException } from '../exceptions/invalid-email.exception';

export class Email {
  private constructor(readonly value: string) {}

  static fromPlain(value: string): Email {
    const normalized = value.toLowerCase().trim();
    if (!this.isValid(normalized)) {
      throw new InvalidEmailException(value);
    }
    return new Email(normalized);
  }

  private static isValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  equals(other: Email): boolean { return this.value === other.value; }
  toString(): string { return this.value; }
}
```

## Patrón de puerto (interface)

```typescript
// domain/ports/user-repository.port.ts
import { User } from '../entities/user.entity';
import { UserId } from '../value-objects/user-id.vo';
import { Email } from '../value-objects/email.vo';

export interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  findByEmail(email: Email): Promise<User | null>;
  save(user: User): Promise<void>;
}

// Token para inyección
export const USER_REPOSITORY = Symbol('USER_REPOSITORY');
```

## Patrón de caso de uso

```typescript
// application/use-cases/register.use-case.ts
import { Injectable, Inject } from '@nestjs/common';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.vo';
import { Password } from '../../domain/value-objects/password.vo';
import { UserRepository, USER_REPOSITORY } from '../../domain/ports/user-repository.port';
import { PasswordHasher, PASSWORD_HASHER } from '../../domain/ports/password-hasher.port';
import { DuplicateEmailException } from '../../domain/exceptions/duplicate-email.exception';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  async execute(input: RegisterInput): Promise<RegisterOutput> {
    const email = Email.fromPlain(input.email);
    const existing = await this.userRepo.findByEmail(email);
    if (existing) throw new DuplicateEmailException(input.email);

    // Toda la validación está en los Value Objects
    const password = Password.fromPlain(input.password);
    const hashedPwd = await this.hasher.hash(password);

    const user = User.create(email, hashedPwd, input.firstName, input.lastName);
    await this.userRepo.save(user);

    return { userId: user.id.toString(), email: user.email.toString() };
  }
}
```

## Patrón de mapper (ORM ↔ Domain)

```typescript
// infrastructure/persistence/mappers/user.mapper.ts
import { UserOrmEntity } from '../entities/user.orm-entity';
import { User } from '../../../../domain/entities/user.entity';
import { UserId, UserStatus, Email, HashedPassword, Role, FirstName, LastName } from '../../../..';

export class UserMapper {
  static toDomain(orm: UserOrmEntity): User {
    return User.reconstruct({
      id: UserId.fromPlain(orm.id),
      email: Email.fromPlain(orm.email),
      passwordHash: HashedPassword.fromPlain(orm.passwordHash),
      status: UserStatus.fromPlain(orm.status),
      roles: orm.roles.map(r => Role.fromPlain(r)),
      firstName: FirstName.fromPlain(orm.firstName),
      lastName: LastName.fromPlain(orm.lastName),
      failedAttempts: orm.failedLoginAttempts,
      lockedUntil: orm.lockedUntil,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
      version: orm.version,
    });
  }

  static toPersistence(domain: User): Partial<UserOrmEntity> {
    return {
      id: domain.id.value,
      email: domain.email.value,
      passwordHash: domain.passwordHash,
      firstName: domain.firstName.value,
      lastName: domain.lastName.value,
      roles: domain.roles.map(r => r.value),
      status: domain.status.value,
      failedLoginAttempts: domain.failedAttempts,
      lockedUntil: domain.lockedUntil,
      version: domain.version,
    };
  }
}
```

## Inyección de dependencias con tokens

```typescript
// infrastructure/persistence/repositories/user.repository.impl.ts
@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly ormRepo: Repository<UserOrmEntity>,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    const orm = await this.ormRepo.findOne({ where: { id: id.value } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const orm = await this.ormRepo.findOne({ where: { email: email.value } });
    return orm ? UserMapper.toDomain(orm) : null;
  }

  async save(user: User): Promise<void> {
    const orm = UserMapper.toPersistence(user);
    await this.ormRepo.save(orm);
  }
}
```

## Reglas de oro

1. `domain/` nunca importa de capas superiores
2. `application/` solo importa de `domain/`
3. Los puertos viven en `domain/ports/` y se implementan en `infrastructure/`
4. Los mappers solo existen en `infrastructure/persistence/mappers/`
5. Las entidades ORM tienen sufijo `.orm-entity.ts`
6. Los value objects se construyen con `static fromPlain()` (validación) o `static reconstruct()` (sin validación, desde BD)
7. Los eventos de dominio son interfaces/classes puras en `domain/events/`
8. La publicación de eventos se hace por `EventPublisher` (puerto) → `KafkaEventPublisher` (adapter)
