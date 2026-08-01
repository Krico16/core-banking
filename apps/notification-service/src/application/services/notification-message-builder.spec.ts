import { buildNotificationMessage } from './notification-message-builder';

describe('buildNotificationMessage', () => {
  it('builds a message for PaymentCompleted', () => {
    const result = buildNotificationMessage('PaymentCompleted', {
      paymentId: 'pay_1',
      amount: 10050,
      currency: 'EUR',
    });

    expect(result).toEqual({
      subjectId: 'pay_1',
      message: 'Payment pay_1 completed: 100.50 EUR',
    });
  });

  it('builds a message for PaymentRejected', () => {
    const result = buildNotificationMessage('PaymentRejected', {
      paymentId: 'pay_2',
      reason: 'AMOUNT_EXCEEDS_DAILY_LIMIT',
    });

    expect(result).toEqual({
      subjectId: 'pay_2',
      message: 'Payment pay_2 rejected: AMOUNT_EXCEEDS_DAILY_LIMIT',
    });
  });

  it('builds a message for AccountOpened, keyed by customerId', () => {
    const result = buildNotificationMessage('AccountOpened', {
      accountId: 'acc_1',
      customerId: 'cust_1',
      accountNumber: 'EUR1234567890',
    });

    expect(result).toEqual({
      subjectId: 'cust_1',
      message: 'Account EUR1234567890 opened',
    });
  });

  it('builds a message for CustomerSuspended', () => {
    const result = buildNotificationMessage('CustomerSuspended', {
      customerId: 'cust_2',
      reason: 'FRAUD',
    });

    expect(result).toEqual({
      subjectId: 'cust_2',
      message: 'Your account access has been suspended: FRAUD',
    });
  });

  it('returns null for event types this service does not notify', () => {
    expect(buildNotificationMessage('PaymentCreated', { paymentId: 'pay_3' })).toBeNull();
    expect(buildNotificationMessage('AccountFrozen', { accountId: 'acc_2' })).toBeNull();
    expect(buildNotificationMessage('CustomerRegistered', { customerId: 'cust_3' })).toBeNull();
  });
});
