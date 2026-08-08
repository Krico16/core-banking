/**
 * Fixtures escritas a mano para los tipos de evento que el flujo feliz del
 * E2E (tests/end-to-end) nunca dispara — no hay forma de capturarlos "reales"
 * sin forzar deliberadamente un rechazo. Los campos siguen exactamente los
 * `required` de contracts/json-schema/events/payment-rejected(-by-risk).json.
 */
export interface EnvelopeFixture {
  eventId: string;
  eventType: string;
  eventVersion: number;
  occurredAt: string;
  producer: string;
  correlationId: string;
  causationId: string;
  subjectId: string;
  data: Record<string, unknown>;
}

export const syntheticEvents: EnvelopeFixture[] = [
  {
    eventId: '01JSYNTHETIC0000000000001',
    eventType: 'PaymentRejectedByRisk',
    eventVersion: 1,
    occurredAt: '2026-08-06T00:00:00.000Z',
    producer: 'risk-service',
    correlationId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    causationId: 'bbbbbbbbbbbbbbbb',
    subjectId: 'pay_01JSYNTHETIC000000000001',
    data: {
      paymentId: 'pay_01JSYNTHETIC000000000001',
      evaluationId: '01JSYNTHETIC0000000000002',
      riskScore: 95,
      reason: 'AMOUNT_EXCEEDS_DAILY_LIMIT',
      rejectedAt: '2026-08-06T00:00:00.000Z',
    },
  },
  {
    eventId: '01JSYNTHETIC0000000000003',
    eventType: 'PaymentRejected',
    eventVersion: 1,
    occurredAt: '2026-08-06T00:00:01.000Z',
    producer: 'payment-service',
    correlationId: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    causationId: '01JSYNTHETIC0000000000001',
    subjectId: 'pay_01JSYNTHETIC000000000001',
    data: {
      paymentId: 'pay_01JSYNTHETIC000000000001',
      idempotencyKey: 'pay-synthetic-000000000001',
      sourceAccountId: '01JSYNTHETIC0000000000AAA',
      targetAccountId: '01JSYNTHETIC0000000000BBB',
      amount: 6_000_000,
      currency: 'EUR',
      description: 'Fixture sintética de rechazo por límite diario',
      initiatedBy: 'anonymous',
      status: 'FAILED',
      ledgerEntryId: null,
      failureReason: 'AMOUNT_EXCEEDS_DAILY_LIMIT',
      createdAt: '2026-08-06T00:00:00.000Z',
      updatedAt: '2026-08-06T00:00:01.000Z',
    },
  },
];
