import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Payment } from '../../../domain/entities';
import { PaymentRepository } from '../../../domain/ports';
import { TransactionContext } from '../../../domain/ports/transaction-runner.port';
import { PaymentOrmEntity } from '../entities/payment.orm-entity';
import { PaymentMapper } from '../mappers/payment.mapper';

@Injectable()
export class PaymentRepositoryImpl implements PaymentRepository {
  constructor(
    @InjectRepository(PaymentOrmEntity)
    private readonly repo: Repository<PaymentOrmEntity>,
  ) {}

  async save(payment: Payment, ctx?: TransactionContext): Promise<void> {
    const repo = ctx ? (ctx as EntityManager).getRepository(PaymentOrmEntity) : this.repo;
    const orm = PaymentMapper.toOrm(payment);
    await repo.save(orm);
  }

  async findById(id: string): Promise<Payment | null> {
    const orm = await this.repo.findOne({ where: { id } });
    return orm ? PaymentMapper.toDomain(orm) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const orm = await this.repo.findOne({ where: { idempotencyKey: key } });
    return orm ? PaymentMapper.toDomain(orm) : null;
  }

  async findByStatus(status: string): Promise<Payment[]> {
    const orms = await this.repo.find({ where: { status } });
    return orms.map(PaymentMapper.toDomain);
  }
}
