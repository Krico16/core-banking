import { RefreshToken } from '../entities';
import { TokenId } from '../value-objects';

export interface RefreshTokenRepository {
  findById(id: TokenId): Promise<RefreshToken | null>;
  save(refreshToken: RefreshToken): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  cleanupExpired(): Promise<void>;
}

export const REFRESH_TOKEN_REPOSITORY = 'REFRESH_TOKEN_REPOSITORY';
