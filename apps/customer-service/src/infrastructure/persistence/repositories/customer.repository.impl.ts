import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { CustomerOrmEntity } from '../entities/customer.orm-entity';
import { CustomerMapper } from '../mappers/customer.mapper';
import { Customer } from '../../../domain/entities/customer.entity';
import { CustomerRepository } from '../../../domain/ports/customer-repository.port';
import { CustomerId } from '../../../domain/value-objects/customer-id.vo';
import { TransactionContext } from '../../../domain/ports/transaction-runner.port';

@Injectable()
export class CustomerRepositoryImpl implements CustomerRepository {
  constructor(
    @InjectRepository(CustomerOrmEntity)
    private readonly ormRepo: Repository<CustomerOrmEntity>,
  ) {}

  async findById(id: CustomerId): Promise<Customer | null> {
    const orm = await this.ormRepo.findOne({ where: { id: id.value } });
    return orm ? CustomerMapper.toDomain(orm) : null;
  }

  async findByUserId(userId: string): Promise<Customer | null> {
    const orm = await this.ormRepo.findOne({ where: { userId } });
    return orm ? CustomerMapper.toDomain(orm) : null;
  }

  async save(customer: Customer, ctx?: TransactionContext): Promise<void> {
    const repo = ctx ? (ctx as EntityManager).getRepository(CustomerOrmEntity) : this.ormRepo;
    const orm = CustomerMapper.toPersistence(customer);
    await repo.save(orm);
  }
}
