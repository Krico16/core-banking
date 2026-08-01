import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  Email,
  Password,
  TokenId,
  InvalidCredentialsException,
  UserLockedException,
  UserSuspendedException,
  PasswordHasher,
  PASSWORD_HASHER,
  TokenService,
  TOKEN_SERVICE,
  UserRepository,
  USER_REPOSITORY,
  RefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
  RefreshToken,
} from '../../domain';

export interface LoginCommand {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface TokenPairResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(PASSWORD_HASHER)
    private readonly passwordHasher: PasswordHasher,
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: LoginCommand): Promise<TokenPairResult> {
    const email = Email.create(command.email);
    const password = Password.create(command.password);

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      this.logger.warn({ email: email.getValue() }, 'Login attempt for non-existent user');
      throw new InvalidCredentialsException();
    }

    if (user.isLocked()) {
      this.logger.warn({ userId: user.id.getValue() }, 'Login attempt for locked account');
      throw new UserLockedException(user.lockedUntil?.toISOString());
    }

    if (user.isSuspended()) {
      this.logger.warn({ userId: user.id.getValue() }, 'Login attempt for suspended account');
      throw new UserSuspendedException();
    }

    const isValid = await this.passwordHasher.verify(password, user.passwordHash);
    if (!isValid) {
      user.registerLoginFailure();
      await this.userRepository.save(user);

      this.logger.warn(
        { userId: user.id.getValue(), attempts: user.failedLoginAttempts },
        'Failed login attempt',
      );
      throw new InvalidCredentialsException();
    }

    user.registerLoginSuccess();
    await this.userRepository.save(user);

    const roles = user.roles;
    const accessTokenResult = await this.tokenService.generateAccessToken({
      sub: user.id.getValue(),
      email: user.email.getValue(),
      roles,
    });

    const refreshTokenResult = await this.tokenService.generateRefreshToken({
      sub: user.id.getValue(),
      email: user.email.getValue(),
    });

    const refreshToken = RefreshToken.create({
      id: TokenId.create(refreshTokenResult.tokenId),
      userId: user.id.getValue(),
      tokenHash: refreshTokenResult.tokenId,
      expiresAt: refreshTokenResult.expiresAt,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

    await this.refreshTokenRepository.save(refreshToken);

    this.logger.info(
      { userId: user.id.getValue(), email: user.email.getValue() },
      'User logged in successfully',
    );

    return {
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult.token,
      expiresIn: accessTokenResult.expiresIn,
      tokenType: 'Bearer',
    };
  }
}
