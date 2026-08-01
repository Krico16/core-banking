import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ulid } from 'ulidx';
import {
  User,
  UserId,
  Email,
  Password,
  FirstName,
  LastName,
  Role,
  UserAlreadyExistsException,
  PasswordHasher,
  PASSWORD_HASHER,
  UserRepository,
  USER_REPOSITORY,
} from '../../domain';

export interface RegisterCommand {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface RegisterResult {
  userId: string;
  email: string;
  roles: string[];
}

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: RegisterCommand): Promise<RegisterResult> {
    const email = Email.create(command.email);
    const password = Password.create(command.password);
    const firstName = FirstName.create(command.firstName);
    const lastName = LastName.create(command.lastName);

    const existing = await this.userRepository.findByEmail(email);
    if (existing) {
      throw new UserAlreadyExistsException(email.getValue());
    }

    const passwordHash = await this.passwordHasher.hash(password);

    const user = User.create({
      id: UserId.create(ulid()),
      email,
      passwordHash,
      firstName,
      lastName,
      roles: [Role.CUSTOMER],
    });

    await this.userRepository.save(user);

    this.logger.info({ userId: user.id.getValue(), email: email.getValue() }, 'User registered successfully');

    return {
      userId: user.id.getValue(),
      email: user.email.getValue(),
      roles: user.roleNames,
    };
  }
}
