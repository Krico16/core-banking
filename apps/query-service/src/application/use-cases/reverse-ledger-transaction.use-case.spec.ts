import { Test, TestingModule } from '@nestjs/testing';
import { ReverseLedgerTransactionUseCase } from './reverse-ledger-transaction.use-case';
import { TRANSACTION_VIEW_REPOSITORY } from '../../domain/ports/transaction-view-repository.port';
import { TransactionView } from '../../domain/entities/transaction-view.entity';

const mockRepo = { save: jest.fn(), findByEntryId: jest.fn(), findByAccountId: jest.fn() };

describe('ReverseLedgerTransactionUseCase', () => {
  let useCase: ReverseLedgerTransactionUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findByEntryId, mockRepo.findByAccountId].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReverseLedgerTransactionUseCase,
        { provide: TRANSACTION_VIEW_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(ReverseLedgerTransactionUseCase);
  });

  it('inserts new rows for the reversal and marks the original rows REVERSED', async () => {
    const originalRowA = TransactionView.reconstruct({
      id: 'row_A',
      entryId: 'entry_1',
      accountId: 'acc_A',
      counterpartAccountId: 'acc_B',
      direction: 'DEBIT',
      amount: 10000,
      currency: 'EUR',
      entryType: 'TRANSFER',
      status: 'POSTED',
      postedAt: new Date(),
    });
    const originalRowB = TransactionView.reconstruct({
      id: 'row_B',
      entryId: 'entry_1',
      accountId: 'acc_B',
      counterpartAccountId: 'acc_A',
      direction: 'CREDIT',
      amount: 10000,
      currency: 'EUR',
      entryType: 'TRANSFER',
      status: 'POSTED',
      postedAt: new Date(),
    });

    mockRepo.findByEntryId.mockImplementation(async (entryId: string) => {
      if (entryId === 'reversal_1') return [];
      if (entryId === 'entry_1') return [originalRowA, originalRowB];
      return [];
    });

    await useCase.execute({
      originalEntryId: 'entry_1',
      reversalEntryId: 'reversal_1',
      reversedAt: '2026-01-02T00:00:00Z',
      entries: [
        { accountId: 'acc_A', type: 'CREDIT', amount: 10000, currency: 'EUR' },
        { accountId: 'acc_B', type: 'DEBIT', amount: 10000, currency: 'EUR' },
      ],
    });

    // 2 filas nuevas de la reversa + 2 actualizaciones de las filas originales
    expect(mockRepo.save).toHaveBeenCalledTimes(4);

    const newRows = mockRepo.save.mock.calls
      .map((c) => c[0])
      .filter((v) => v.entryId === 'reversal_1');
    expect(newRows).toHaveLength(2);
    expect(newRows.every((v) => v.entryType === 'REVERSAL')).toBe(true);

    const updatedOriginals = mockRepo.save.mock.calls
      .map((c) => c[0])
      .filter((v) => v.entryId === 'entry_1');
    expect(updatedOriginals).toHaveLength(2);
    expect(updatedOriginals.every((v) => v.status === 'REVERSED')).toBe(true);
  });

  it('is idempotent for the reversal rows: does not duplicate if already recorded', async () => {
    const existingReversalRow = TransactionView.reconstruct({
      id: 'row_rev',
      entryId: 'reversal_1',
      accountId: 'acc_A',
      counterpartAccountId: 'acc_B',
      direction: 'CREDIT',
      amount: 10000,
      currency: 'EUR',
      entryType: 'REVERSAL',
      status: 'POSTED',
      postedAt: new Date(),
    });
    mockRepo.findByEntryId.mockImplementation(async (entryId: string) => {
      if (entryId === 'reversal_1') return [existingReversalRow];
      return [];
    });

    await useCase.execute({
      originalEntryId: 'entry_1',
      reversalEntryId: 'reversal_1',
      reversedAt: '2026-01-02T00:00:00Z',
      entries: [{ accountId: 'acc_A', type: 'CREDIT', amount: 10000, currency: 'EUR' }],
    });

    const newRows = mockRepo.save.mock.calls
      .map((c) => c[0])
      .filter((v) => v.entryId === 'reversal_1');
    expect(newRows).toHaveLength(0);
  });
});
