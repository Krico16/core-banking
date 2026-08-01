import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountView } from '../../../domain/entities/account-view.entity';
import { AccountViewRepository } from '../../../domain/ports/account-view-repository.port';
import { AccountViewOrmEntity } from '../entities/account-view.orm-entity';
import { AccountViewMapper } from '../mappers/account-view.mapper';

@Injectable()
export class AccountViewRepositoryImpl implements AccountViewRepository {
  constructor(
    @InjectRepository(AccountViewOrmEntity)
    private readonly ormRepo: Repository<AccountViewOrmEntity>,
  ) {}

  async save(view: AccountView): Promise<void> {
    await this.ormRepo.save(AccountViewMapper.toPersistence(view));
  }

  async findById(accountId: string): Promise<AccountView | null> {
    const orm = await this.ormRepo.findOne({ where: { accountId } });
    return orm ? AccountViewMapper.toDomain(orm) : null;
  }

  async findByCustomerId(customerId: string): Promise<AccountView[]> {
    const orms = await this.ormRepo.find({ where: { customerId } });
    return orms.map(AccountViewMapper.toDomain);
  }
}
