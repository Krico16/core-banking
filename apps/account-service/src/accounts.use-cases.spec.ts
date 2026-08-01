import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { OpenAccountUseCase } from './application/use-cases/open-account.use-case';
import { FreezeAccountUseCase } from './application/use-cases/freeze-account.use-case';
import { UnfreezeAccountUseCase } from './application/use-cases/unfreeze-account.use-case';
import { GetAccountUseCase } from './application/use-cases/get-account.use-case';
import { ACCOUNT_REPOSITORY } from './domain/ports/account-repository.port';
import { OUTBOX_EVENT_REPOSITORY } from './domain/ports/outbox-event-repository.port';
import { TRANSACTION_RUNNER } from './domain/ports/transaction-runner.port';
import { CUSTOMER_VERIFICATION_REPOSITORY } from './domain/ports/customer-verification-repository.port';
import {
  AccountId,
  AccountNumber,
  Money,
  AccountType,
  AccountStatus,
} from './domain/value-objects';
import { Account } from './domain/entities';
import { AccountNotFoundException, CustomerNotVerifiedException } from './domain/exceptions';

const mockRepo = { findById: jest.fn(), findByCustomerId: jest.fn(), save: jest.fn() };
const mockOutbox = { save: jest.fn() };
const mockTxRunner = {
  run: jest.fn((work: (ctx: unknown) => Promise<unknown>) => work(undefined)),
};
const mockVerification = { isVerified: jest.fn(), upsert: jest.fn() };
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function makeAccount(overrides: Partial<{ status: string }> = {}): Account {
  return Account.reconstruct({
    id: AccountId.fromPlain('01KYD7BCC5XT9Y870SKDMF18GT'),
    customerId: '01KYD7BCC5XT9Y870SKDMF18GT',
    accountNumber: AccountNumber.fromPlain('EUR1234567890'),
    accountType: AccountType.CHECKING,
    currency: 'EUR',
    balance: Money.zero('EUR'),
    status: AccountStatus.fromPlain(overrides.status || 'ACTIVE'),
    dailyLimit: Money.fromPlain(1000000, 'EUR'),
    transactionLimit: Money.fromPlain(500000, 'EUR'),
    version: 0,
  });
}

describe('Account Use Cases', () => {
  let openUC: OpenAccountUseCase;
  let freezeUC: FreezeAccountUseCase;
  let unfreezeUC: UnfreezeAccountUseCase;
  let getUC: GetAccountUseCase;

  beforeEach(async () => {
    [
      mockRepo.findById,
      mockRepo.findByCustomerId,
      mockRepo.save,
      mockOutbox.save,
      mockVerification.isVerified,
      mockVerification.upsert,
    ].forEach((m) => m.mockReset());
    mockTxRunner.run.mockImplementation((work: (ctx: unknown) => Promise<unknown>) =>
      work(undefined),
    );
    mockVerification.isVerified.mockResolvedValue(true);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpenAccountUseCase,
        FreezeAccountUseCase,
        UnfreezeAccountUseCase,
        GetAccountUseCase,
        { provide: ACCOUNT_REPOSITORY, useValue: mockRepo },
        { provide: OUTBOX_EVENT_REPOSITORY, useValue: mockOutbox },
        { provide: TRANSACTION_RUNNER, useValue: mockTxRunner },
        { provide: CUSTOMER_VERIFICATION_REPOSITORY, useValue: mockVerification },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();
    openUC = module.get(OpenAccountUseCase);
    freezeUC = module.get(FreezeAccountUseCase);
    unfreezeUC = module.get(UnfreezeAccountUseCase);
    getUC = module.get(GetAccountUseCase);
  });

  describe('OpenAccountUseCase', () => {
    it('should open account and write AccountOpened to the outbox', async () => {
      mockRepo.save.mockResolvedValue(undefined);
      const result = await openUC.execute({
        customerId: 'c1',
        accountType: 'CHECKING',
        currency: 'EUR',
        dailyLimitAmount: 1000000,
        transactionLimitAmount: 500000,
      });
      expect(result.accountType).toBe('CHECKING');
      expect(result.currency).toBe('EUR');
      expect(result.status).toBe('ACTIVE');
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockOutbox.save).toHaveBeenCalled();
      expect(mockTxRunner.run).toHaveBeenCalled();
    });

    it('should reject if customer is not verified', async () => {
      mockVerification.isVerified.mockResolvedValue(false);
      await expect(
        openUC.execute({
          customerId: 'c1',
          accountType: 'CHECKING',
          currency: 'EUR',
          dailyLimitAmount: 1000000,
          transactionLimitAmount: 500000,
        }),
      ).rejects.toThrow(CustomerNotVerifiedException);
      expect(mockRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('FreezeAccountUseCase', () => {
    it('should freeze account', async () => {
      mockRepo.findById.mockResolvedValue(makeAccount());
      const result = await freezeUC.execute('01KYD7BCC5XT9Y870SKDMF18GT', 'FRAUD');
      expect(result.status).toBe('FROZEN');
      expect(mockOutbox.save).toHaveBeenCalled();
    });

    it('should throw if not found', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(freezeUC.execute('nonexistent', 'FRAUD')).rejects.toThrow(
        AccountNotFoundException,
      );
    });
  });

  describe('UnfreezeAccountUseCase', () => {
    it('should unfreeze', async () => {
      mockRepo.findById.mockResolvedValue(makeAccount({ status: 'FROZEN' }));
      const result = await unfreezeUC.execute('01KYD7BCC5XT9Y870SKDMF18GT');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('GetAccountUseCase', () => {
    it('should find by ID', async () => {
      mockRepo.findById.mockResolvedValue(makeAccount());
      const result = await getUC.byId('01KYD7BCC5XT9Y870SKDMF18GT');
      expect(result.currency).toBe('EUR');
    });

    it('should find by customerId', async () => {
      mockRepo.findByCustomerId.mockResolvedValue([makeAccount()]);
      const result = await getUC.byCustomerId('c1');
      expect(result).toHaveLength(1);
    });
  });
});
