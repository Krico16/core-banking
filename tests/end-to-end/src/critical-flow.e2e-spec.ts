import { apiGet, apiPost } from './helpers/http-client';
import { pollUntil } from './helpers/poll';
import { EventCapture } from './helpers/event-capture';

/**
 * Flujo crítico completo, black-box, todo a través de api-gateway
 * (http://localhost:3009 por defecto, override con GATEWAY_URL).
 * Requiere el stack completo levantado: docker compose -f compose.yaml up -d
 *
 * Puerta de referencia: requests/banking.http (secciones 1-7) — mismos
 * payloads y encadenamiento de IDs entre pasos, traducido a aserciones.
 */

interface RegisterResponse {
  userId: string;
  email: string;
  roles: string[];
}

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

interface CustomerResponse {
  id: string;
  kycStatus?: string;
  [key: string]: unknown;
}

interface AccountResponse {
  id: string;
  currency: string;
  [key: string]: unknown;
}

interface BalanceResponse {
  balance: number;
  currency: string;
  [key: string]: unknown;
}

interface PaymentResponse {
  id: string;
  status: string;
  failureReason?: string;
  [key: string]: unknown;
}

interface NotificationResponse {
  subjectId: string;
  [key: string]: unknown;
}

const testEmail = `e2e_${Date.now()}@example.com`;
const testPassword = 'SuperSecret123!';

describe('Flujo crítico end-to-end (auth -> customer -> account -> ledger -> payment -> query -> notification)', () => {
  const eventCapture = new EventCapture();

  let accessToken: string;
  let userId: string;
  let customerId: string;
  let accountAId: string;
  let accountBId: string;
  let paymentId: string;

  beforeAll(async () => {
    await eventCapture.start();
  });

  afterAll(async () => {
    eventCapture.saveTo('captured-events');
    await eventCapture.stop();
  });

  test('el gateway responde', async () => {
    const res = await apiGet('/api/health');
    expect(res.status).toBe(200);
  });

  test('registro y login emiten un access token válido', async () => {
    const registerRes = await apiPost<RegisterResponse>('/api/auth/register', {
      email: testEmail,
      password: testPassword,
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
    expect(registerRes.status).toBe(201);
    userId = registerRes.body.userId;
    expect(userId).toBeTruthy();

    const loginRes = await apiPost<LoginResponse>('/api/auth/login', {
      email: testEmail,
      password: testPassword,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeTruthy();
    accessToken = loginRes.body.accessToken;
  });

  test('alta de cliente y verificación de KYC', async () => {
    const createRes = await apiPost<CustomerResponse>(
      '/api/customers',
      {
        userId,
        email: testEmail,
        firstName: 'Ada',
        lastName: 'Lovelace',
        phoneNumber: '+34600000000',
        country: 'PE',
      },
      { token: accessToken },
    );
    expect(createRes.status).toBe(201);

    const meRes = await apiGet<CustomerResponse>('/api/customers/me', { token: accessToken });
    expect(meRes.status).toBe(200);
    customerId = meRes.body.id;
    expect(customerId).toBeTruthy();

    const kycRes = await apiPost<CustomerResponse>(
      `/api/customers/${customerId}/verify-kyc`,
      undefined,
      { token: accessToken },
    );
    expect(kycRes.status).toBe(200);
  });

  test('apertura de dos cuentas EUR (reintenta por la propagación async de CustomerVerified)', async () => {
    const openAccount = (accountType: string) =>
      pollUntil(
        () =>
          apiPost<AccountResponse>(
            '/api/accounts',
            {
              customerId,
              accountType,
              currency: 'EUR',
              dailyLimitAmount: 1_000_000,
              transactionLimitAmount: 500_000,
            },
            { token: accessToken },
          ),
        (res) => res.status === 201,
        { timeoutMs: 20_000, intervalMs: 1_000, description: `abrir cuenta ${accountType}` },
      );

    const accountA = await openAccount('CHECKING');
    accountAId = accountA.body.id;
    expect(accountAId).toBeTruthy();

    const accountB = await openAccount('SAVINGS');
    accountBId = accountB.body.id;
    expect(accountBId).toBeTruthy();
    expect(accountBId).not.toBe(accountAId);
  });

  test('depósito de fondos en la cuenta A', async () => {
    // ledger-service crea su propia LedgerAccount al consumir AccountOpened (async) —
    // reintenta como con la apertura de cuenta, no está garantizado que ya exista.
    const depositRes = await pollUntil(
      () =>
        apiPost<BalanceResponse>(
          '/api/ledger/deposit',
          {
            accountId: accountAId,
            amount: 500.0,
            currency: 'EUR',
            description: 'Fondeo inicial E2E',
          },
          { token: accessToken, headers: { 'Idempotency-Key': `dep-${accountAId}-${Date.now()}` } },
        ),
      (res) => res.status === 200,
      { timeoutMs: 20_000, intervalMs: 1_000, description: 'depósito en cuenta A' },
    );
    expect(depositRes.status).toBe(200);

    const balanceRes = await apiGet<BalanceResponse>(`/api/ledger/accounts/${accountAId}/balance`, {
      token: accessToken,
    });
    expect(balanceRes.status).toBe(200);
    expect(balanceRes.body.balance).toBe(500.0);
  });

  test('transferencia A -> B completa la saga de punta a punta', async () => {
    const idempotencyKey = `pay-${accountAId}-${Date.now()}`;
    const transferRes = await apiPost<PaymentResponse>(
      '/api/payments/transfer',
      {
        idempotencyKey,
        sourceAccountId: accountAId,
        targetAccountId: accountBId,
        amount: 10_000,
        currency: 'EUR',
        description: 'Transferencia de prueba E2E',
      },
      { token: accessToken, headers: { 'Idempotency-Key': idempotencyKey } },
    );
    expect(transferRes.status).toBe(201);
    paymentId = transferRes.body.id;
    expect(paymentId).toBeTruthy();

    const finalPayment = await pollUntil(
      () => apiGet<PaymentResponse>(`/api/payments/${paymentId}`, { token: accessToken }),
      (res) => res.body.status === 'COMPLETED' || res.body.status === 'FAILED',
      { timeoutMs: 60_000, intervalMs: 1_000, description: 'saga de pago llega a estado terminal' },
    );

    expect(finalPayment.body.status).toBe('COMPLETED');

    const balanceA = await apiGet<BalanceResponse>(`/api/ledger/accounts/${accountAId}/balance`, {
      token: accessToken,
    });
    const balanceB = await apiGet<BalanceResponse>(`/api/ledger/accounts/${accountBId}/balance`, {
      token: accessToken,
    });
    expect(balanceA.body.balance).toBe(400.0);
    expect(balanceB.body.balance).toBe(100.0);
  });

  test('las proyecciones de query-service reflejan la transferencia (eventualmente consistente)', async () => {
    // A diferencia del endpoint REST de ledger-service (BigDecimal decimal), la
    // proyección de query-service espeja el wire format de los eventos: centavos
    // (Money.toCents()) — 400.00 EUR llega como 40000.
    const accountView = await pollUntil(
      () => apiGet<BalanceResponse>(`/api/query/accounts/${accountAId}`, { token: accessToken }),
      (res) => res.status === 200 && res.body.balance === 40_000,
      { timeoutMs: 30_000, description: 'proyección de cuenta A refleja el nuevo saldo' },
    );
    expect(accountView.body.balance).toBe(40_000);

    const paymentView = await pollUntil(
      () => apiGet<PaymentResponse>(`/api/query/payments/${paymentId}`, { token: accessToken }),
      (res) => res.status === 200 && res.body.status === 'COMPLETED',
      { timeoutMs: 30_000, description: 'proyección de pago llega a COMPLETED' },
    );
    expect(paymentView.body.status).toBe('COMPLETED');

    const dashboard = await pollUntil(
      () =>
        apiGet<{ customerId: string; accounts: AccountResponse[] }>(
          `/api/query/customers/${customerId}/dashboard`,
          { token: accessToken },
        ),
      (res) => res.status === 200 && res.body.accounts.length >= 2,
      { timeoutMs: 30_000, description: 'dashboard del cliente incluye ambas cuentas' },
    );
    expect(dashboard.body.customerId).toBe(customerId);
    expect(dashboard.body.accounts.length).toBeGreaterThanOrEqual(2);

    const transactions = await apiGet<unknown[]>(`/api/query/accounts/${accountAId}/transactions`, {
      token: accessToken,
    });
    expect(transactions.status).toBe(200);
    expect(Array.isArray(transactions.body)).toBe(true);
  });

  test('hay al menos una notificación asociada al pago', async () => {
    const notifications = await pollUntil(
      () => apiGet<NotificationResponse[]>(`/api/notifications/${paymentId}`, { token: accessToken }),
      (res) => res.status === 200 && Array.isArray(res.body) && res.body.length > 0,
      { timeoutMs: 20_000, description: 'notificación del pago' },
    );
    expect(notifications.body.length).toBeGreaterThan(0);
  });
});
