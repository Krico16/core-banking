import { Inject, Injectable } from '@nestjs/common';
import { CustomerDashboard } from '../../domain/entities/customer-dashboard.entity';
import {
  CustomerDashboardRepository,
  CUSTOMER_DASHBOARD_REPOSITORY,
} from '../../domain/ports/customer-dashboard-repository.port';
import { RecordCustomerRegisteredInput } from '../dto/record-customer-registered.input';

@Injectable()
export class RecordCustomerRegisteredUseCase {
  constructor(
    @Inject(CUSTOMER_DASHBOARD_REPOSITORY) private readonly repo: CustomerDashboardRepository,
  ) {}

  async execute(input: RecordCustomerRegisteredInput): Promise<void> {
    const existing = await this.repo.findById(input.customerId);
    if (existing) return; // idempotencia a nivel de proyección además de processed_events

    const dashboard = CustomerDashboard.create({
      customerId: input.customerId,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      country: input.country,
    });

    await this.repo.save(dashboard);
  }
}
