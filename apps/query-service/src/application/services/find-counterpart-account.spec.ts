import { findCounterpartAccount } from './find-counterpart-account';

describe('findCounterpartAccount', () => {
  it('returns the other account when there are exactly 2 entries', () => {
    const entries = [
      { accountId: 'acc_A', type: 'DEBIT' as const, amount: 100, currency: 'EUR' },
      { accountId: 'acc_B', type: 'CREDIT' as const, amount: 100, currency: 'EUR' },
    ];
    expect(findCounterpartAccount(entries[0], entries)).toBe('acc_B');
    expect(findCounterpartAccount(entries[1], entries)).toBe('acc_A');
  });

  it('returns null when there are not exactly 2 entries', () => {
    const entries = [
      { accountId: 'acc_A', type: 'DEBIT' as const, amount: 100, currency: 'EUR' },
      { accountId: 'acc_B', type: 'CREDIT' as const, amount: 60, currency: 'EUR' },
      { accountId: 'acc_C', type: 'CREDIT' as const, amount: 40, currency: 'EUR' },
    ];
    expect(findCounterpartAccount(entries[0], entries)).toBeNull();
  });
});
