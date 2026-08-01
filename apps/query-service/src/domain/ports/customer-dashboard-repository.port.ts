import { CustomerDashboard } from '../entities/customer-dashboard.entity';

export interface CustomerDashboardRepository {
  save(dashboard: CustomerDashboard): Promise<void>;
  findById(customerId: string): Promise<CustomerDashboard | null>;
}

export const CUSTOMER_DASHBOARD_REPOSITORY = Symbol('CUSTOMER_DASHBOARD_REPOSITORY');
