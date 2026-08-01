import { Test, TestingModule } from '@nestjs/testing';
import { PinoLogger } from 'nestjs-pino';
import { RegisterCustomerUseCase } from './application/use-cases/register-customer.use-case';
import { VerifyKycUseCase } from './application/use-cases/verify-kyc.use-case';
import { SuspendCustomerUseCase } from './application/use-cases/suspend-customer.use-case';
import { ReactivateCustomerUseCase } from './application/use-cases/reactivate-customer.use-case';
import { GetCustomerUseCase } from './application/use-cases/get-customer.use-case';
import { CUSTOMER_REPOSITORY } from './domain/ports/customer-repository.port';
import { OUTBOX_EVENT_REPOSITORY } from './domain/ports/outbox-event-repository.port';
import { TRANSACTION_RUNNER } from './domain/ports/transaction-runner.port';
import { CustomerId, Email, KycStatus, CustomerStatus } from './domain/value-objects';
import { Customer } from './domain/entities';
import {
  CustomerNotFoundException,
  KycAlreadyVerifiedException,
  DuplicateCustomerException,
} from './domain/exceptions';

const mockRepo = { findById: jest.fn(), findByUserId: jest.fn(), save: jest.fn() };
const mockOutbox = { save: jest.fn() };
const mockTxRunner = {
  run: jest.fn((work: (ctx: unknown) => Promise<unknown>) => work(undefined)),
};
const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

function makeCustomer(overrides: Partial<{ kycStatus: string; status: string }> = {}): Customer {
  return Customer.reconstruct({
    id: CustomerId.fromPlain('01KYD7BCC5XT9Y870SKDMF18GT'),
    userId: '01KYC3GED942JXGSBQSDGMV0ZX',
    email: Email.fromPlain('test@bank.com'),
    firstName: 'Test',
    lastName: 'User',
    phoneNumber: '',
    street: '',
    city: '',
    country: 'ES',
    postalCode: '',
    kycStatus: KycStatus.fromPlain(overrides.kycStatus || 'PENDING'),
    status: CustomerStatus.fromPlain(overrides.status || 'ACTIVE'),
    riskLevel: 'LOW',
    version: 0,
  });
}

describe('Customer Use Cases', () => {
  let registerUC: RegisterCustomerUseCase;
  let verifyKycUC: VerifyKycUseCase;
  let suspendUC: SuspendCustomerUseCase;
  let reactivateUC: ReactivateCustomerUseCase;
  let getUC: GetCustomerUseCase;

  beforeEach(async () => {
    [mockRepo.findById, mockRepo.findByUserId, mockRepo.save, mockOutbox.save].forEach((m) =>
      m.mockReset(),
    );
    mockTxRunner.run.mockImplementation((work: (ctx: unknown) => Promise<unknown>) =>
      work(undefined),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegisterCustomerUseCase,
        VerifyKycUseCase,
        SuspendCustomerUseCase,
        ReactivateCustomerUseCase,
        GetCustomerUseCase,
        { provide: CUSTOMER_REPOSITORY, useValue: mockRepo },
        { provide: OUTBOX_EVENT_REPOSITORY, useValue: mockOutbox },
        { provide: TRANSACTION_RUNNER, useValue: mockTxRunner },
        { provide: PinoLogger, useValue: mockLogger },
      ],
    }).compile();
    registerUC = module.get(RegisterCustomerUseCase);
    verifyKycUC = module.get(VerifyKycUseCase);
    suspendUC = module.get(SuspendCustomerUseCase);
    reactivateUC = module.get(ReactivateCustomerUseCase);
    getUC = module.get(GetCustomerUseCase);
  });

  describe('RegisterCustomerUseCase', () => {
    it('should register and write CustomerRegistered to the outbox', async () => {
      mockRepo.findByUserId.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue(undefined);

      const result = await registerUC.execute({
        userId: 'u1',
        email: 'test@bank.com',
        firstName: 'Test',
        lastName: 'User',
        country: 'ES',
      });

      expect(result.email).toBe('test@bank.com');
      expect(result.status).toBe('ACTIVE');
      expect(mockRepo.save).toHaveBeenCalled();
      expect(mockOutbox.save).toHaveBeenCalled();
      expect(mockTxRunner.run).toHaveBeenCalled();
    });

    it('should throw DuplicateCustomerException', async () => {
      mockRepo.findByUserId.mockResolvedValue(makeCustomer());
      await expect(
        registerUC.execute({
          userId: 'u1',
          email: 'test@bank.com',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toThrow(DuplicateCustomerException);
    });
  });

  describe('VerifyKycUseCase', () => {
    it('should verify KYC', async () => {
      const customer = makeCustomer({ kycStatus: 'PENDING' });
      mockRepo.findById.mockResolvedValue(customer);

      const result = await verifyKycUC.execute('01KYD7BCC5XT9Y870SKDMF18GT');
      expect(result.kycStatus).toBe('VERIFIED');
      expect(mockOutbox.save).toHaveBeenCalled();
    });

    it('should throw if already verified', async () => {
      mockRepo.findById.mockResolvedValue(makeCustomer({ kycStatus: 'VERIFIED' }));
      await expect(verifyKycUC.execute('01KYD7BCC5XT9Y870SKDMF18GT')).rejects.toThrow(
        KycAlreadyVerifiedException,
      );
    });
  });

  describe('SuspendCustomerUseCase', () => {
    it('should suspend customer', async () => {
      mockRepo.findById.mockResolvedValue(makeCustomer());
      const result = await suspendUC.execute('01KYD7BCC5XT9Y870SKDMF18GT', 'FRAUD');
      expect(result.status).toBe('SUSPENDED');
      expect(mockOutbox.save).toHaveBeenCalled();
    });
  });

  describe('ReactivateCustomerUseCase', () => {
    it('should reactivate', async () => {
      mockRepo.findById.mockResolvedValue(makeCustomer({ status: 'SUSPENDED' }));
      const result = await reactivateUC.execute('01KYD7BCC5XT9Y870SKDMF18GT');
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('GetCustomerUseCase', () => {
    it('should find by ID', async () => {
      mockRepo.findById.mockResolvedValue(makeCustomer());
      const result = await getUC.byId('01KYD7BCC5XT9Y870SKDMF18GT');
      expect(result.email).toBe('test@bank.com');
    });

    it('should throw CustomerNotFoundException', async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(getUC.byId('nonexistent')).rejects.toThrow(CustomerNotFoundException);
    });
  });
});
