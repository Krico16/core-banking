import { Test, TestingModule } from '@nestjs/testing';
import { RecordAccountOpenedUseCase } from './record-account-opened.use-case';
import { ACCOUNT_VIEW_REPOSITORY } from '../../domain/ports/account-view-repository.port';
import { CUSTOMER_DASHBOARD_REPOSITORY } from '../../domain/ports/customer-dashboard-repository.port';
import { CustomerDashboard } from '../../domain/entities/customer-dashboard.entity';

const mockAccountViewRepo = { save: jest.fn(), findById: jest.fn(), findByCustomerId: jest.fn() };
const mockDashboardRepo = { save: jest.fn(), findById: jest.fn() };

function makeInput() {
  return {
    accountId: 'acc_1',
    customerId: 'cust_1',
    accountNumber: 'EUR1234567890',
    accountType: 'CHECKING',
    currency: 'EUR',
  };
}

describe('RecordAccountOpenedUseCase', () => {
  let useCase: RecordAccountOpenedUseCase;

  beforeEach(async () => {
    [
      mockAccountViewRepo.save,
      mockAccountViewRepo.findById,
      mockAccountViewRepo.findByCustomerId,
      mockDashboardRepo.save,
      mockDashboardRepo.findById,
    ].forEach((m) => m.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordAccountOpenedUseCase,
        { provide: ACCOUNT_VIEW_REPOSITORY, useValue: mockAccountViewRepo },
        { provide: CUSTOMER_DASHBOARD_REPOSITORY, useValue: mockDashboardRepo },
      ],
    }).compile();
    useCase = module.get(RecordAccountOpenedUseCase);
  });

  it('creates an AccountView with balance 0 and increments the dashboard account count', async () => {
    mockAccountViewRepo.findById.mockResolvedValue(null);
    const dashboard = CustomerDashboard.reconstruct({
      customerId: 'cust_1',
      email: 'test@bank.com',
      firstName: 'Test',
      lastName: 'User',
      country: 'ES',
      accountCount: 0,
      updatedAt: new Date(),
    });
    mockDashboardRepo.findById.mockResolvedValue(dashboard);

    await useCase.execute(makeInput());

    expect(mockAccountViewRepo.save).toHaveBeenCalledTimes(1);
    const savedView = mockAccountViewRepo.save.mock.calls[0][0];
    expect(savedView.balance).toBe(0);

    expect(mockDashboardRepo.save).toHaveBeenCalledTimes(1);
    const savedDashboard = mockDashboardRepo.save.mock.calls[0][0];
    expect(savedDashboard.accountCount).toBe(1);
  });

  it('does not fail if the dashboard does not exist yet (out-of-order events)', async () => {
    mockAccountViewRepo.findById.mockResolvedValue(null);
    mockDashboardRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute(makeInput())).resolves.toBeUndefined();

    expect(mockAccountViewRepo.save).toHaveBeenCalledTimes(1);
    expect(mockDashboardRepo.save).not.toHaveBeenCalled();
  });

  it('is idempotent: skips if the account view already exists', async () => {
    mockAccountViewRepo.findById.mockResolvedValue({ accountId: 'acc_1' });

    await useCase.execute(makeInput());

    expect(mockAccountViewRepo.save).not.toHaveBeenCalled();
    expect(mockDashboardRepo.findById).not.toHaveBeenCalled();
  });
});
