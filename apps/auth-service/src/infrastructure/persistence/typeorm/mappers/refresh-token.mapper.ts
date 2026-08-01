import { RefreshToken, TokenId } from '../../../../domain';
import { RefreshTokenOrmEntity } from '../entities';

export class RefreshTokenMapper {
  static toDomain(orm: RefreshTokenOrmEntity): RefreshToken {
    return RefreshToken.reconstruct({
      id: TokenId.create(orm.id),
      userId: orm.userId,
      tokenHash: orm.tokenHash,
      expiresAt: orm.expiresAt,
      revokedAt: orm.revokedAt,
      replacedByTokenId: orm.replacedByTokenId,
      ipAddress: orm.ipAddress,
      userAgent: orm.userAgent,
      createdAt: orm.createdAt,
      updatedAt: orm.updatedAt,
    });
  }

  static toPersistence(token: RefreshToken): RefreshTokenOrmEntity {
    const orm = new RefreshTokenOrmEntity();
    orm.id = token.id.getValue();
    orm.userId = token.userId;
    orm.tokenHash = token.tokenHash;
    orm.expiresAt = token.expiresAt;
    orm.revokedAt = token.revokedAt;
    orm.replacedByTokenId = token.replacedByTokenId;
    orm.ipAddress = token.ipAddress;
    orm.userAgent = token.userAgent;
    return orm;
  }
}
