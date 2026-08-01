import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserRepository, User, UserId, Email } from '../../../../domain';
import { UserOrmEntity } from '../entities';
import { UserMapper } from '../mappers';

@Injectable()
export class UserRepositoryImpl implements UserRepository {
  constructor(
    @InjectRepository(UserOrmEntity)
    private readonly repository: Repository<UserOrmEntity>,
  ) {}

  async findById(id: UserId): Promise<User | null> {
    const orm = await this.repository.findOne({ where: { id: id.getValue() } });
    if (!orm) return null;
    return UserMapper.toDomain(orm);
  }

  async findByEmail(email: Email): Promise<User | null> {
    const orm = await this.repository.findOne({
      where: { email: email.getValue() },
    });
    if (!orm) return null;
    return UserMapper.toDomain(orm);
  }

  async save(user: User): Promise<void> {
    const orm = UserMapper.toPersistence(user);

    const existing = await this.repository.findOne({
      where: { id: orm.id },
    });

    if (existing) {
      orm.createdAt = existing.createdAt;
      await this.repository.update(
        { id: orm.id, version: existing.version },
        UserMapper.toPersistencePartial(user),
      );
    } else {
      await this.repository.save(orm);
    }
  }
}
