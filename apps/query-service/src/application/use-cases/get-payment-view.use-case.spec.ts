import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GetPaymentViewUseCase } from './get-payment-view.use-case';
import { PAYMENT_VIEW_REPOSITORY } from '../../domain/ports/payment-view-repository.port';

const mockRepo = { save: jest.fn(), findById: jest.fn() };

describe('GetPaymentViewUseCase', () => {
  let useCase: GetPaymentViewUseCase;

  beforeEach(async () => {
    [mockRepo.save, mockRepo.findById].forEach((m) => m.mockReset());
    const module: TestingModule = await Test.createTestingModule({
      providers: [GetPaymentViewUseCase, { provide: PAYMENT_VIEW_REPOSITORY, useValue: mockRepo }],
    }).compile();
    useCase = module.get(GetPaymentViewUseCase);
  });

  it('returns the payment view by id', async () => {
    const view = { paymentId: 'pay_1' };
    mockRepo.findById.mockResolvedValue(view);
    expect(await useCase.byId('pay_1')).toBe(view);
  });

  it('throws NotFoundException if the payment view does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(useCase.byId('pay_unknown')).rejects.toThrow(NotFoundException);
  });
});
