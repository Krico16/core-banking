import { CustomerVerificationRepositoryImpl } from './customer-verification.repository.impl';

describe('CustomerVerificationRepositoryImpl', () => {
  it('returns false when no projection row exists yet', async () => {
    const ormRepo = { findOne: jest.fn().mockResolvedValue(null), upsert: jest.fn() };
    const repo = new CustomerVerificationRepositoryImpl(ormRepo as never);

    expect(await repo.isVerified('cust-1')).toBe(false);
  });

  it('returns the stored verified flag', async () => {
    const ormRepo = {
      findOne: jest.fn().mockResolvedValue({ customerId: 'cust-1', verified: true }),
      upsert: jest.fn(),
    };
    const repo = new CustomerVerificationRepositoryImpl(ormRepo as never);

    expect(await repo.isVerified('cust-1')).toBe(true);
  });

  it('upserts by customerId', async () => {
    const ormRepo = { findOne: jest.fn(), upsert: jest.fn().mockResolvedValue(undefined) };
    const repo = new CustomerVerificationRepositoryImpl(ormRepo as never);

    await repo.upsert('cust-1', true);

    expect(ormRepo.upsert).toHaveBeenCalledWith({ customerId: 'cust-1', verified: true }, [
      'customerId',
    ]);
  });
});
