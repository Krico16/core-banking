import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerDashboard, AccountView } from '../../domain/entities';
import {
  CustomerDashboardRepository,
  CUSTOMER_DASHBOARD_REPOSITORY,
} from '../../domain/ports/customer-dashboard-repository.port';
import {
  AccountViewRepository,
  ACCOUNT_VIEW_REPOSITORY,
} from '../../domain/ports/account-view-repository.port';

export interface CustomerDashboardResult {
  dashboard: CustomerDashboard;
  accounts: AccountView[];
}

@Injectable()
export class GetCustomerDashboardUseCase {
  constructor(
    @Inject(CUSTOMER_DASHBOARD_REPOSITORY)
    private readonly dashboardRepo: CustomerDashboardRepository,
    @Inject(ACCOUNT_VIEW_REPOSITORY) private readonly accountViewRepo: AccountViewRepository,
  ) {}

  async byCustomerId(customerId: string): Promise<CustomerDashboardResult> {
    const dashboard = await this.dashboardRepo.findById(customerId);
    if (!dashboard) throw new NotFoundException(`Customer dashboard not found: ${customerId}`);

    const accounts = await this.accountViewRepo.findByCustomerId(customerId);
    return { dashboard, accounts };
  }
}
