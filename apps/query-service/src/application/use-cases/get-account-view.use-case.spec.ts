import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetAccountViewUseCase } from './get-account-view.use-case';
import { ACCOUNT_VIEW_REPOSITORY } from '../../domain/ports/account-view-repository.port';
import { TRANSACTION_VIEW_REPOSITORY } from '../../domain/ports/transaction-view-repository.port';
import { AccountView } from '../../domain/entities/account-view.entity';

const mockAccountViewRepo = { save: jest.fn(), findById: jest.fn(), findByCustomerId: jest.fn() };
const mockTransactionViewRepo = {
  save: jest.fn(),
  findByEntryId: jest.fn(),
  findByAccountId: jest.fn(),
};

describe('GetAccountViewUseCase', () => {
  let useCase: GetAccountViewUseCase;

  beforeEach(async () => {
    Object.values(mockAccountViewRepo).forEach((m) => m.mockReset());
    Object.values(mockTransactionViewRepo).forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAccountViewUseCase,
        { provide: ACCOUNT_VIEW_REPOSITORY, useValue: mockAccountViewRepo },
        { provide: TRANSACTION_VIEW_REPOSITORY, useValue: mockTransactionViewRepo },
      ],
    }).compile();
    useCase = module.get(GetAccountViewUseCase);
  });

  it('returns the account view by id', async () => {
    const view = AccountView.create({
      accountId: 'acc_1',
      customerId: 'cust_1',
      accountNumber: 'EUR123',
      accountType: 'CHECKING',
      currency: 'EUR',
    });
    mockAccountViewRepo.findById.mockResolvedValue(view);

    const result = await useCase.byId('acc_1');
    expect(result).toBe(view);
  });

  it('throws NotFoundException if the account view does not exist', async () => {
    mockAccountViewRepo.findById.mockResolvedValue(null);
    await expect(useCase.byId('acc_unknown')).rejects.toThrow(NotFoundException);
  });

  it('delegates transaction history to the transaction view repository', async () => {
    mockTransactionViewRepo.findByAccountId.mockResolvedValue([]);
    await useCase.transactionsByAccountId('acc_1');
    expect(mockTransactionViewRepo.findByAccountId).toHaveBeenCalledWith('acc_1');
  });
});
