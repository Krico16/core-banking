import { Test, TestingModule } from '@nestjs/testing';
import { RecordLedgerTransactionUseCase } from './record-ledger-transaction.use-case';
import { TRANSACTION_VIEW_REPOSITORY } from '../../domain/ports/transaction-view-repository.port';

const mockRepo = { save: jest.fn(), findByEntryId: jest.fn(), findByAccountId: jest.fn() };

describe('RecordLedgerTransactionUseCase', () => {
  let useCase: RecordLedgerTransactionUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findByEntryId, mockRepo.findByAccountId].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordLedgerTransactionUseCase,
        { provide: TRANSACTION_VIEW_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(RecordLedgerTransactionUseCase);
  });

  it('creates one TransactionView row per entry, cross-referencing the counterpart account', async () => {
    mockRepo.findByEntryId.mockResolvedValue([]);

    await useCase.execute({
      entryId: 'entry_1',
      entryType: 'TRANSFER',
      postedAt: '2026-01-01T00:00:00Z',
      entries: [
        { accountId: 'acc_A', type: 'DEBIT', amount: 10000, currency: 'EUR' },
        { accountId: 'acc_B', type: 'CREDIT', amount: 10000, currency: 'EUR' },
      ],
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(2);
    const rowA = mockRepo.save.mock.calls.find((c) => c[0].accountId === 'acc_A')[0];
    const rowB = mockRepo.save.mock.calls.find((c) => c[0].accountId === 'acc_B')[0];
    expect(rowA.counterpartAccountId).toBe('acc_B');
    expect(rowA.direction).toBe('DEBIT');
    expect(rowB.counterpartAccountId).toBe('acc_A');
    expect(rowB.direction).toBe('CREDIT');
    expect(rowA.status).toBe('POSTED');
  });

  it('is idempotent: skips if rows for this entryId already exist', async () => {
    mockRepo.findByEntryId.mockResolvedValue([{ id: 'existing' }]);

    await useCase.execute({
      entryId: 'entry_1',
      entryType: 'TRANSFER',
      postedAt: '2026-01-01T00:00:00Z',
      entries: [
        { accountId: 'acc_A', type: 'DEBIT', amount: 10000, currency: 'EUR' },
        { accountId: 'acc_B', type: 'CREDIT', amount: 10000, currency: 'EUR' },
      ],
    });

    expect(mockRepo.save).not.toHaveBeenCalled();
  });

  it('leaves counterpartAccountId null when there are not exactly 2 entries', async () => {
    mockRepo.findByEntryId.mockResolvedValue([]);

    await useCase.execute({
      entryId: 'entry_2',
      entryType: 'DEPOSIT',
      postedAt: '2026-01-01T00:00:00Z',
      entries: [
        { accountId: 'acc_A', type: 'DEBIT', amount: 500, currency: 'EUR' },
        { accountId: 'acc_B', type: 'CREDIT', amount: 300, currency: 'EUR' },
        { accountId: 'acc_C', type: 'CREDIT', amount: 200, currency: 'EUR' },
      ],
    });

    for (const call of mockRepo.save.mock.calls) {
      expect(call[0].counterpartAccountId).toBeNull();
    }
  });
});
