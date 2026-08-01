import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AccountOrmEntity } from '../entities/account.orm-entity';
import { AccountMapper } from '../mappers/account.mapper';
import { Account } from '../../../domain/entities/account.entity';
import { AccountRepository } from '../../../domain/ports/account-repository.port';
import { AccountId } from '../../../domain/value-objects/account-id.vo';
import { TransactionContext } from '../../../domain/ports/transaction-runner.port';

@Injectable()
export class AccountRepositoryImpl implements AccountRepository {
  constructor(
    @InjectRepository(AccountOrmEntity)
    private readonly ormRepo: Repository<AccountOrmEntity>,
  ) {}

  async findById(id: AccountId): Promise<Account | null> {
    const orm = await this.ormRepo.findOne({ where: { id: id.value } });
    return orm ? AccountMapper.toDomain(orm) : null;
  }

  async findByCustomerId(customerId: string): Promise<Account[]> {
    const orms = await this.ormRepo.find({ where: { customerId } });
    return orms.map(AccountMapper.toDomain);
  }

  async save(account: Account, ctx?: TransactionContext): Promise<void> {
    const repo = ctx ? (ctx as EntityManager).getRepository(AccountOrmEntity) : this.ormRepo;
    const orm = AccountMapper.toPersistence(account);
    await repo.save(orm);
  }
}
