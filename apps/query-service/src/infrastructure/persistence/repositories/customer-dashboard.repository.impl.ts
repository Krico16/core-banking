import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerDashboard } from '../../../domain/entities/customer-dashboard.entity';
import { CustomerDashboardRepository } from '../../../domain/ports/customer-dashboard-repository.port';
import { CustomerDashboardOrmEntity } from '../entities/customer-dashboard.orm-entity';
import { CustomerDashboardMapper } from '../mappers/customer-dashboard.mapper';

@Injectable()
export class CustomerDashboardRepositoryImpl implements CustomerDashboardRepository {
  constructor(
    @InjectRepository(CustomerDashboardOrmEntity)
    private readonly ormRepo: Repository<CustomerDashboardOrmEntity>,
  ) {}

  async save(dashboard: CustomerDashboard): Promise<void> {
    await this.ormRepo.save(CustomerDashboardMapper.toPersistence(dashboard));
  }

  async findById(customerId: string): Promise<CustomerDashboard | null> {
    const orm = await this.ormRepo.findOne({ where: { customerId } });
    return orm ? CustomerDashboardMapper.toDomain(orm) : null;
  }
}
