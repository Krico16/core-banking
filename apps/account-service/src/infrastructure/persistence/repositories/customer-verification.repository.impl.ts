import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerProjectionOrmEntity } from '../entities/customer-projection.orm-entity';
import { CustomerVerificationRepository } from '../../../domain/ports/customer-verification-repository.port';

@Injectable()
export class CustomerVerificationRepositoryImpl implements CustomerVerificationRepository {
  constructor(
    @InjectRepository(CustomerProjectionOrmEntity)
    private readonly ormRepo: Repository<CustomerProjectionOrmEntity>,
  ) {}

  async isVerified(customerId: string): Promise<boolean> {
    const row = await this.ormRepo.findOne({ where: { customerId } });
    return row?.verified ?? false;
  }

  async upsert(customerId: string, verified: boolean): Promise<void> {
    await this.ormRepo.upsert({ customerId, verified }, ['customerId']);
  }
}
