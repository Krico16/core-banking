import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, IsNull } from 'typeorm';
import {
  RefreshTokenRepository,
  RefreshToken,
  TokenId,
} from '../../../../domain';
import { RefreshTokenOrmEntity } from '../entities';
import { RefreshTokenMapper } from '../mappers';

@Injectable()
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshTokenOrmEntity)
    private readonly repository: Repository<RefreshTokenOrmEntity>,
  ) {}

  async findById(id: TokenId): Promise<RefreshToken | null> {
    const orm = await this.repository.findOne({
      where: { id: id.getValue() },
    });
    if (!orm) return null;
    return RefreshTokenMapper.toDomain(orm);
  }

  async save(refreshToken: RefreshToken): Promise<void> {
    const orm = RefreshTokenMapper.toPersistence(refreshToken);

    const existing = await this.repository.findOne({
      where: { id: orm.id },
    });

    if (existing) {
      await this.repository.update({ id: orm.id }, {
        revokedAt: orm.revokedAt,
        replacedByTokenId: orm.replacedByTokenId,
      });
    } else {
      await this.repository.save(orm);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.repository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
  }

  async cleanupExpired(): Promise<void> {
    await this.repository.delete({
      expiresAt: LessThan(new Date()),
    });
  }
}
