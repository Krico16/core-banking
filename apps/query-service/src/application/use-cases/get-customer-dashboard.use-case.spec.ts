import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetCustomerDashboardUseCase } from './get-customer-dashboard.use-case';
import { CUSTOMER_DASHBOARD_REPOSITORY } from '../../domain/ports/customer-dashboard-repository.port';
import { ACCOUNT_VIEW_REPOSITORY } from '../../domain/ports/account-view-repository.port';
import { CustomerDashboard } from '../../domain/entities/customer-dashboard.entity';

const mockDashboardRepo = { save: jest.fn(), findById: jest.fn() };
const mockAccountViewRepo = { save: jest.fn(), findById: jest.fn(), findByCustomerId: jest.fn() };

describe('GetCustomerDashboardUseCase', () => {
  let useCase: GetCustomerDashboardUseCase;

  beforeEach(async () => {
    Object.values(mockDashboardRepo).forEach((m) => m.mockReset());
    Object.values(mockAccountViewRepo).forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetCustomerDashboardUseCase,
        { provide: CUSTOMER_DASHBOARD_REPOSITORY, useValue: mockDashboardRepo },
        { provide: ACCOUNT_VIEW_REPOSITORY, useValue: mockAccountViewRepo },
      ],
    }).compile();
    useCase = module.get(GetCustomerDashboardUseCase);
  });

  it('returns the dashboard with its accounts', async () => {
    const dashboard = CustomerDashboard.create({
      customerId: 'cust_1',
      email: 'a@b.com',
      firstName: 'A',
      lastName: 'B',
      country: 'ES',
    });
    mockDashboardRepo.findById.mockResolvedValue(dashboard);
    mockAccountViewRepo.findByCustomerId.mockResolvedValue([]);

    const result = await useCase.byCustomerId('cust_1');
    expect(result.dashboard).toBe(dashboard);
    expect(result.accounts).toEqual([]);
  });

  it('throws NotFoundException if the dashboard does not exist', async () => {
    mockDashboardRepo.findById.mockResolvedValue(null);
    await expect(useCase.byCustomerId('cust_unknown')).rejects.toThrow(NotFoundException);
  });
});
