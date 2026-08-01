import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { ulid } from 'ulidx';
import {
  UserId,
  TokenId,
  InvalidTokenException,
  TokenService,
  TOKEN_SERVICE,
  UserRepository,
  USER_REPOSITORY,
  RefreshTokenRepository,
  REFRESH_TOKEN_REPOSITORY,
  RefreshToken,
} from '../../domain';

export interface RefreshCommand {
  userId: string;
  tokenId: string;
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
export class RefreshTokenUseCase {
  constructor(
    @Inject(TOKEN_SERVICE)
    private readonly tokenService: TokenService,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: RefreshCommand): Promise<TokenPairResult> {
    const userId = UserId.create(command.userId);
    const tokenId = TokenId.create(command.tokenId);

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new InvalidTokenException('User not found');
    }

    if (!user.isActive()) {
      throw new InvalidTokenException('Account is not active');
    }

    const existingToken = await this.refreshTokenRepository.findById(tokenId);
    if (!existingToken || existingToken.isRevoked()) {
      throw new InvalidTokenException('Invalid refresh token');
    }

    if (existingToken.userId !== command.userId) {
      throw new InvalidTokenException('Token does not belong to user');
    }

    existingToken.revoke();
    await this.refreshTokenRepository.save(existingToken);

    const refreshTokenResult = await this.tokenService.generateRefreshToken({
      sub: user.id.getValue(),
      email: user.email.getValue(),
    });

    const newRefreshToken = RefreshToken.create({
      id: TokenId.create(refreshTokenResult.tokenId),
      userId: user.id.getValue(),
      tokenHash: refreshTokenResult.tokenId,
      expiresAt: refreshTokenResult.expiresAt,
      ipAddress: command.ipAddress,
      userAgent: command.userAgent,
    });

    await this.refreshTokenRepository.save(newRefreshToken);

    const accessTokenResult = await this.tokenService.generateAccessToken({
      sub: user.id.getValue(),
      email: user.email.getValue(),
      roles: user.roles,
    });

    this.logger.info({ userId: user.id.getValue() }, 'Token refreshed successfully');

    return {
      accessToken: accessTokenResult.token,
      refreshToken: refreshTokenResult.token,
      expiresIn: accessTokenResult.expiresIn,
      tokenType: 'Bearer',
    };
  }
}
