import { Test, TestingModule } from '@nestjs/testing';
import { RecordCustomerRegisteredUseCase } from './record-customer-registered.use-case';
import { CUSTOMER_DASHBOARD_REPOSITORY } from '../../domain/ports/customer-dashboard-repository.port';

const mockRepo = { save: jest.fn(), findById: jest.fn() };

describe('RecordCustomerRegisteredUseCase', () => {
  let useCase: RecordCustomerRegisteredUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findById].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordCustomerRegisteredUseCase,
        { provide: CUSTOMER_DASHBOARD_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(RecordCustomerRegisteredUseCase);
  });

  it('creates a new CustomerDashboard', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await useCase.execute({
      customerId: 'cust_1',
      email: 'test@bank.com',
      firstName: 'Test',
      lastName: 'User',
      country: 'ES',
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const saved = mockRepo.save.mock.calls[0][0];
    expect(saved.customerId).toBe('cust_1');
    expect(saved.accountCount).toBe(0);
  });

  it('is idempotent: skips if dashboard already exists', async () => {
    mockRepo.findById.mockResolvedValue({ customerId: 'cust_1' });

    await useCase.execute({
      customerId: 'cust_1',
      email: 'test@bank.com',
      firstName: 'Test',
      lastName: 'User',
      country: 'ES',
    });

    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
