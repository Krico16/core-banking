import { Test, TestingModule } from '@nestjs/testing';
import { UpsertPaymentViewUseCase } from './upsert-payment-view.use-case';
import { PAYMENT_VIEW_REPOSITORY } from '../../domain/ports/payment-view-repository.port';

const mockRepo = { save: jest.fn(), findById: jest.fn() };

describe('UpsertPaymentViewUseCase', () => {
  let useCase: UpsertPaymentViewUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findById].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UpsertPaymentViewUseCase,
        { provide: PAYMENT_VIEW_REPOSITORY, useValue: mockRepo },
      ],
    }).compile();
    useCase = module.get(UpsertPaymentViewUseCase);
  });

  it('upserts the full payment snapshot regardless of which event triggered it', async () => {
    await useCase.execute({
      paymentId: 'pay_1',
      sourceAccountId: 'acc_A',
      targetAccountId: 'acc_B',
      amount: 10000,
      currency: 'EUR',
      description: 'Test payment',
      initiatedBy: 'user-1',
      status: 'COMPLETED',
      ledgerEntryId: 'entry_1',
      failureReason: null,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:05:00Z',
      completedAt: '2026-01-01T00:05:00Z',
      reversedAt: null,
    });

    expect(mockRepo.save).toHaveBeenCalledTimes(1);
    const saved = mockRepo.save.mock.calls[0][0];
    expect(saved.paymentId).toBe('pay_1');
    expect(saved.status).toBe('COMPLETED');
    expect(saved.completedAt).toEqual(new Date('2026-01-01T00:05:00Z'));
    expect(saved.reversedAt).toBeNull();
  });
});
