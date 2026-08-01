import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OutboxEventOrmEntity } from '../entities/outbox-event.orm-entity';
import { OutboxEventMapper } from '../mappers/outbox-event.mapper';
import { OutboxEvent } from '../../../domain/entities/outbox-event.entity';
import { OutboxEventRepository } from '../../../domain/ports/outbox-event-repository.port';
import { TransactionContext } from '../../../domain/ports/transaction-runner.port';

@Injectable()
export class OutboxEventRepositoryImpl implements OutboxEventRepository {
  constructor(
    @InjectRepository(OutboxEventOrmEntity)
    private readonly ormRepo: Repository<OutboxEventOrmEntity>,
  ) {}

  async save(event: OutboxEvent, ctx?: TransactionContext): Promise<void> {
    const repo = ctx ? (ctx as EntityManager).getRepository(OutboxEventOrmEntity) : this.ormRepo;
    await repo.save(OutboxEventMapper.toPersistence(event));
  }
}
