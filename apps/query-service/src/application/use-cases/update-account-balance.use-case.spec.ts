import { Test, TestingModule } from '@nestjs/testing';
import { UpdateAccountBalanceUseCase } from './update-account-balance.use-case';
import { ACCOUNT_VIEW_REPOSITORY } from '../../domain/ports/account-view-repository.port';
import { AccountView } from '../../domain/entities/account-view.entity';

const mockRepo = { save: jest.fn(), findById: jest.fn(), findByCustomerId: jest.fn() };

describe('UpdateAccountBalanceUseCase', () => {
  let useCase: UpdateAccountBalanceUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findById, mockRepo.findByCustomerId].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpdateAccountBalanceUseCase,
        { provide: ACCOUNT_VIEW_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(UpdateAccountBalanceUseCase);
  });

  it('updates the balance of an existing AccountView', async () => {
    const existing = AccountView.reconstruct({
      accountId: 'acc_1',
      customerId: 'cust_1',
      accountNumber: 'EUR1234567890',
      accountType: 'CHECKING',
      currency: 'EUR',
      balance: 1000,
      updatedAt: new Date(),
    });
    mockRepo.findById.mockResolvedValue(existing);

    await useCase.execute({ accountId: 'acc_1', newBalance: 1500 });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    expect(mockRepo.save.mock.calls[0][0].balance).toBe(1500);
  });

  it('does nothing if the AccountView does not exist yet', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await useCase.execute({ accountId: 'acc_unknown', newBalance: 1500 });

    expect(mockRepo.save).not.toHaveBeenCalled();
  });
});
