import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { TokenId, REFRESH_TOKEN_REPOSITORY, RefreshTokenRepository } from '../../domain';

export interface LogoutCommand {
  userId: string;
  tokenId: string;
}

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY)
    private readonly refreshTokenRepository: RefreshTokenRepository,
    private readonly logger: PinoLogger,
  ) {}

  async execute(command: LogoutCommand): Promise<void> {
    const tokenId = TokenId.create(command.tokenId);

    const token = await this.refreshTokenRepository.findById(tokenId);
    if (token && !token.isRevoked()) {
      token.revoke();
      await this.refreshTokenRepository.save(token);
    }

    this.logger.info({ userId: command.userId }, 'User logged out');
  }

  async executeLogoutAll(userId: string): Promise<void> {
    await this.refreshTokenRepository.revokeAllForUser(userId);
    this.logger.info({ userId }, 'User logged out from all sessions');
  }
}
