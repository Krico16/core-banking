import { PaymentSagaOrchestrator } from '../src/application/saga/payment-saga.orchestrator';
import { Payment } from '../src/domain/entities/payment.entity';
import { PaymentStatus } from '../src/domain/value-objects';
import { LedgerClient } from '../src/domain/ports';
import { Money } from '../src/domain/value-objects';

function makePayment(id = 'pay_saga_001'): Payment {
  return Payment.create({
    id,
    idempotencyKey: `ik-${id}`,
    sourceAccountId: 'ACC-A',
    targetAccountId: 'ACC-B',
    amount: Money.fromPlain(10000, 'EUR'),
    description: 'Saga test',
    initiatedBy: 'user-1',
  });
}

describe('PaymentSagaOrchestrator', () => {
  let saga: PaymentSagaOrchestrator;
  let repo: any;
  let outbox: any;
  let txRunner: any;
  let ledger: jest.Mocked<LedgerClient>;

  beforeEach(() => {
    const store = new Map<string, Payment>();

    repo = {
      findById: jest.fn(async (id: string) => store.get(id) || null),
      findByIdempotencyKey: jest.fn(async () => null),
      findByStatus: jest.fn(async () => []),
      save: jest.fn(async (p: Payment) => {
        store.set(p.id, p);
      }),
    };

    outbox = {
      save: jest.fn(async () => {}),
    };

    txRunner = {
      run: jest.fn(async (work: (ctx: unknown) => Promise<unknown>) => work(undefined)),
    };

    ledger = {
      transfer: jest.fn(async () => ({
        journalEntryId: 'journal-xyz',
        transactionId: 'tx-123',
        status: 'POSTED',
      })),
      reverse: jest.fn(async () => ({
        journalEntryId: 'journal-rev',
        transactionId: 'tx-123',
        status: 'POSTED',
      })),
    };

    saga = new PaymentSagaOrchestrator(repo, outbox, txRunner, ledger);
  });

  describe('run()', () => {
    it('stops at RISK_REVIEW and publishes PaymentRiskEvaluationRequested', async () => {
      const payment = makePayment();
      await repo.save(payment);

      await saga.run(payment.id);

      const final = await repo.findById(payment.id);
      expect(final.status).toBe(PaymentStatus.RISK_REVIEW);

      const eventTypes = outbox.save.mock.calls.map((c: any[]) => c[0].eventType);
      expect(eventTypes).toContain('PaymentRiskEvaluationRequested');
      expect(eventTypes).not.toContain('PaymentAuthorized');
      expect(ledger.transfer).not.toHaveBeenCalled();
    });

    it('is idempotent: running twice does not duplicate the risk request', async () => {
      const payment = makePayment();
      await repo.save(payment);

      await saga.run(payment.id);
      const callsAfterFirst = outbox.save.mock.calls.length;

      await saga.run(payment.id);
      const callsAfterSecond = outbox.save.mock.calls.length;

      expect(callsAfterSecond).toBe(callsAfterFirst);
    });
  });

  describe('resumeAfterRiskApproval()', () => {
    it('advances RISK_REVIEW → AUTHORIZED → POSTING → COMPLETED', async () => {
      const payment = makePayment();
      await repo.save(payment);
      await saga.run(payment.id);

      await saga.resumeAfterRiskApproval(payment.id);

      const final = await repo.findById(payment.id);
      expect(final.status).toBe(PaymentStatus.COMPLETED);
      expect(final.ledgerEntryId).toBe('journal-xyz');

      const eventTypes = outbox.save.mock.calls.map((c: any[]) => c[0].eventType);
      expect(eventTypes).toContain('PaymentAuthorized');
      expect(eventTypes).toContain('PaymentCompleted');
    });

    it('calls ledger.transfer with correct params including paymentId', async () => {
      const payment = makePayment();
      await repo.save(payment);
      await saga.run(payment.id);

      await saga.resumeAfterRiskApproval(payment.id);

      expect(ledger.transfer).toHaveBeenCalledWith({
        sourceAccountId: 'ACC-A',
        targetAccountId: 'ACC-B',
        amount: 10000,
        currency: 'EUR',
        idempotencyKey: 'ledger-pay_saga_001',
        description: 'Saga test',
        paymentId: 'pay_saga_001',
      });
    });

    it('fails on ledger error', async () => {
      const payment = makePayment();
      await repo.save(payment);
      await saga.run(payment.id);

      ledger.transfer.mockRejectedValueOnce(new Error('LEDGER_UNAVAILABLE') as any);

      await saga.resumeAfterRiskApproval(payment.id);

      const final = await repo.findById(payment.id);
      expect(final.status).toBe(PaymentStatus.FAILED);
      expect(final.failureReason).toBe('SAGA_INTERNAL_ERROR');
    });

    it('is a no-op if the payment is not in RISK_REVIEW', async () => {
      const payment = makePayment();
      await repo.save(payment); // still CREATED, never ran the saga

      await saga.resumeAfterRiskApproval(payment.id);

      const final = await repo.findById(payment.id);
      expect(final.status).toBe(PaymentStatus.CREATED);
      expect(ledger.transfer).not.toHaveBeenCalled();
    });
  });

  describe('handleRiskRejection()', () => {
    it('transitions RISK_REVIEW → FAILED and publishes PaymentRejected', async () => {
      const payment = makePayment();
      await repo.save(payment);
      await saga.run(payment.id);

      await saga.handleRiskRejection(payment.id, 'AMOUNT_EXCEEDS_DAILY_LIMIT');

      const final = await repo.findById(payment.id);
      expect(final.status).toBe(PaymentStatus.FAILED);
      expect(final.failureReason).toBe('AMOUNT_EXCEEDS_DAILY_LIMIT');

      const eventTypes = outbox.save.mock.calls.map((c: any[]) => c[0].eventType);
      expect(eventTypes).toContain('PaymentRejected');
      expect(ledger.transfer).not.toHaveBeenCalled();
    });

    it('is a no-op if the payment is not in RISK_REVIEW', async () => {
      const payment = makePayment();
      await repo.save(payment); // still CREATED

      await saga.handleRiskRejection(payment.id, 'AMOUNT_EXCEEDS_DAILY_LIMIT');

      const final = await repo.findById(payment.id);
      expect(final.status).toBe(PaymentStatus.CREATED);
    });
  });
});
