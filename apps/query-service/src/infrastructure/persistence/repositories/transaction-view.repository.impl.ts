import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TransactionView } from '../../../domain/entities/transaction-view.entity';
import { TransactionViewRepository } from '../../../domain/ports/transaction-view-repository.port';
import { TransactionViewOrmEntity } from '../entities/transaction-view.orm-entity';
import { TransactionViewMapper } from '../mappers/transaction-view.mapper';

@Injectable()
export class TransactionViewRepositoryImpl implements TransactionViewRepository {
  constructor(
    @InjectRepository(TransactionViewOrmEntity)
    private readonly ormRepo: Repository<TransactionViewOrmEntity>,
  ) {}

  async save(view: TransactionView): Promise<void> {
    await this.ormRepo.save(TransactionViewMapper.toPersistence(view));
  }

  async findByEntryId(entryId: string): Promise<TransactionView[]> {
    const orms = await this.ormRepo.find({ where: { entryId } });
    return orms.map(TransactionViewMapper.toDomain);
  }

  async findByAccountId(accountId: string): Promise<TransactionView[]> {
    const orms = await this.ormRepo.find({ where: { accountId }, order: { postedAt: 'DESC' } });
    return orms.map(TransactionViewMapper.toDomain);
  }
}
