import { Controller, Get, Param } from '@nestjs/common';
import { GetCustomerDashboardUseCase } from '../../application/use-cases/get-customer-dashboard.use-case';

interface CustomerDashboardResponse {
  customerId: string;
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  accountCount: number;
  updatedAt: string;
  accounts: {
    accountId: string;
    accountNumber: string;
    accountType: string;
    currency: string;
    balance: number;
  }[];
}

@Controller('customers')
export class CustomersController {
  constructor(private readonly getCustomerDashboard: GetCustomerDashboardUseCase) {}

  @Get(':customerId/dashboard')
  async dashboard(@Param('customerId') customerId: string): Promise<CustomerDashboardResponse> {
    const { dashboard, accounts } = await this.getCustomerDashboard.byCustomerId(customerId);
    return {
      customerId: dashboard.customerId,
      email: dashboard.email,
      firstName: dashboard.firstName,
      lastName: dashboard.lastName,
      country: dashboard.country,
      accountCount: dashboard.accountCount,
      updatedAt: dashboard.updatedAt.toISOString(),
      accounts: accounts.map((a) => ({
        accountId: a.accountId,
        accountNumber: a.accountNumber,
        accountType: a.accountType,
        currency: a.currency,
        balance: a.balance,
      })),
    };
  }
}
