import { Payment } from '../src/domain/entities/payment.entity';
import { Money, PaymentStatus } from '../src/domain/value-objects';

describe('Payment State Machine', () => {
  function makePayment(): Payment {
    return Payment.create({
      id: 'pay_test_001',
      idempotencyKey: 'ik-001',
      sourceAccountId: 'ACC-A',
      targetAccountId: 'ACC-B',
      amount: Money.fromPlain(10000, 'EUR'),
      description: 'Test',
      initiatedBy: 'user-1',
    });
  }

  it('starts in CREATED', () => {
    const p = makePayment();
    expect(p.status).toBe(PaymentStatus.CREATED);
    expect(p.ledgerEntryId).toBeUndefined();
  });

  it('follows happy path transitions', () => {
    const p = makePayment();

    p.transitionTo(PaymentStatus.VALIDATING);
    expect(p.status).toBe(PaymentStatus.VALIDATING);

    p.transitionTo(PaymentStatus.RISK_REVIEW);
    expect(p.status).toBe(PaymentStatus.RISK_REVIEW);

    p.transitionTo(PaymentStatus.AUTHORIZED);
    expect(p.status).toBe(PaymentStatus.AUTHORIZED);

    p.transitionTo(PaymentStatus.POSTING);
    expect(p.status).toBe(PaymentStatus.POSTING);

    p.setLedgerEntryId('entry-123');
    expect(p.ledgerEntryId).toBe('entry-123');

    p.transitionTo(PaymentStatus.COMPLETED);
    expect(p.status).toBe(PaymentStatus.COMPLETED);
    expect(p.completedAt).toBeDefined();
  });

  it('rejects invalid transitions', () => {
    const p = makePayment();
    // Cannot skip VALIDATING
    expect(() => p.transitionTo(PaymentStatus.AUTHORIZED)).toThrow();
    expect(() => p.transitionTo(PaymentStatus.COMPLETED)).toThrow();
  });

  it('allows reversal from COMPLETED', () => {
    const p = makePayment();
    p.transitionTo(PaymentStatus.VALIDATING);
    p.transitionTo(PaymentStatus.RISK_REVIEW);
    p.transitionTo(PaymentStatus.AUTHORIZED);
    p.transitionTo(PaymentStatus.POSTING);
    p.setLedgerEntryId('entry-1');
    p.transitionTo(PaymentStatus.COMPLETED);

    p.transitionTo(PaymentStatus.REVERSED);
    expect(p.status).toBe(PaymentStatus.REVERSED);
    expect(p.reversedAt).toBeDefined();
  });

  it('rejects reversal from non-COMPLETED', () => {
    const p = makePayment();
    expect(() => p.transitionTo(PaymentStatus.REVERSED)).toThrow();
  });

  it('rejects double reversal', () => {
    const p = makePayment();
    p.transitionTo(PaymentStatus.VALIDATING);
    p.transitionTo(PaymentStatus.RISK_REVIEW);
    p.transitionTo(PaymentStatus.AUTHORIZED);
    p.transitionTo(PaymentStatus.POSTING);
    p.setLedgerEntryId('e');
    p.transitionTo(PaymentStatus.COMPLETED);
    p.transitionTo(PaymentStatus.REVERSED);

    expect(() => p.transitionTo(PaymentStatus.REVERSED)).toThrow();
  });

  it('FAILED is terminal', () => {
    const p = makePayment();
    p.transitionTo(PaymentStatus.FAILED, 'LEDGER_UNAVAILABLE');
    expect(p.failureReason).toBe('LEDGER_UNAVAILABLE');

    // No transitions from FAILED
    expect(() => p.transitionTo(PaymentStatus.VALIDATING)).toThrow();
    expect(() => p.transitionTo(PaymentStatus.COMPLETED)).toThrow();
  });

  it('reconstruct preserves all fields', () => {
    const original = makePayment();
    original.transitionTo(PaymentStatus.VALIDATING);
    const props = original.toProps();
    const reconstructed = Payment.reconstruct(props);
    expect(reconstructed.id).toBe(original.id);
    expect(reconstructed.status).toBe(original.status);
    expect(reconstructed.amount.amount).toBe(original.amount.amount);
  });
});