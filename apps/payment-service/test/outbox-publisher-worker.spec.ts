import { OutboxPublisherWorker } from '../src/infrastructure/messaging/outbox-publisher.worker';

function makeQueryRunner(pendingRows: unknown[]) {
  const query = jest.fn().mockImplementation((sql: string) => {
    if (sql.includes('SELECT')) return Promise.resolve(pendingRows);
    return Promise.resolve(undefined);
  });
  return {
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: { query },
  };
}

describe('OutboxPublisherWorker', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'PAYMENT_EVENTS_TOPIC') return 'banking.payment.events';
      return fallback;
    }),
  };

  it('marks a successfully sent event as PUBLISHED', async () => {
    const row = { id: 'evt-1', aggregate_id: 'pay_1', event_type: 'PaymentCreated', payload: '{}', retry_count: 0 };
    const queryRunner = makeQueryRunner([row]);
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    const producer = { sendRaw: jest.fn().mockResolvedValue(undefined) };

    const worker = new OutboxPublisherWorker(dataSource as never, producer as never, config as never);
    await worker.publishPendingEvents();

    expect(producer.sendRaw).toHaveBeenCalledWith('banking.payment.events', 'pay_1', '{}');
    const updateCall = queryRunner.manager.query.mock.calls.find(([sql]) => sql.includes('SET status'));
    expect(updateCall[0]).toContain("status = 'PUBLISHED'");
    expect(updateCall[1]).toEqual(['evt-1']);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('increments retry_count and keeps PENDING when send fails below max retries', async () => {
    const row = { id: 'evt-2', aggregate_id: 'pay_2', event_type: 'PaymentAuthorized', payload: '{}', retry_count: 3 };
    const queryRunner = makeQueryRunner([row]);
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    const producer = { sendRaw: jest.fn().mockRejectedValue(new Error('broker unreachable')) };

    const worker = new OutboxPublisherWorker(dataSource as never, producer as never, config as never);
    await worker.publishPendingEvents();

    const updateCall = queryRunner.manager.query.mock.calls.find(([sql]) => sql.includes('SET status'));
    expect(updateCall[1]).toEqual(['PENDING', 4, 'broker unreachable', 'evt-2']);
  });

  it('marks event FAILED once retry_count reaches the max', async () => {
    const row = { id: 'evt-3', aggregate_id: 'pay_3', event_type: 'PaymentCompleted', payload: '{}', retry_count: 9 };
    const queryRunner = makeQueryRunner([row]);
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    const producer = { sendRaw: jest.fn().mockRejectedValue(new Error('still down')) };

    const worker = new OutboxPublisherWorker(dataSource as never, producer as never, config as never);
    await worker.publishPendingEvents();

    const updateCall = queryRunner.manager.query.mock.calls.find(([sql]) => sql.includes('SET status'));
    expect(updateCall[1]).toEqual(['FAILED', 10, 'still down', 'evt-3']);
  });

  it('routes PaymentRiskEvaluationRequested to the dedicated risk-requests topic', async () => {
    const row = { id: 'evt-4', aggregate_id: 'pay_4', event_type: 'PaymentRiskEvaluationRequested', payload: '{}', retry_count: 0 };
    const queryRunner = makeQueryRunner([row]);
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    const producer = { sendRaw: jest.fn().mockResolvedValue(undefined) };

    const worker = new OutboxPublisherWorker(dataSource as never, producer as never, config as never);
    await worker.publishPendingEvents();

    expect(producer.sendRaw).toHaveBeenCalledWith('banking.payment.risk-requests', 'pay_4', '{}');
  });

  it('rolls back the transaction if reading pending events fails', async () => {
    const queryRunner = makeQueryRunner([]);
    queryRunner.manager.query = jest.fn().mockRejectedValue(new Error('db down'));
    const dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };
    const producer = { sendRaw: jest.fn() };

    const worker = new OutboxPublisherWorker(dataSource as never, producer as never, config as never);
    await worker.publishPendingEvents();

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });
});
