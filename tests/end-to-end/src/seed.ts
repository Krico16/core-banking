import { apiGet, apiPost } from './helpers/http-client';
import { pollUntil } from './helpers/poll';

/**
 * Deja el stack con datos de demo reproducibles para explorar a mano
 * (Swagger, requests/banking.http, Grafana, Redpanda Console). Mismo flujo
 * feliz que critical-flow.e2e-spec.ts, sin aserciones — un script, no un test.
 * Requiere el stack levantado: docker compose -f compose.yaml up -d
 *
 * Idempotente: identidad de demo fija (no timestamp como en el E2E). Si ya
 * existe un cliente para ese usuario, no repite la creación de cuentas — solo
 * reporta el estado actual y termina.
 */

interface RegisterResponse {
  userId: string;
}
interface MeResponse {
  userId: string;
}
interface LoginResponse {
  accessToken: string;
}
interface CustomerResponse {
  id: string;
  [key: string]: unknown;
}
interface AccountResponse {
  id: string;
  [key: string]: unknown;
}
interface PaymentResponse {
  id: string;
  status: string;
  [key: string]: unknown;
}

const DEMO_EMAIL = 'demo@banking.local';
const DEMO_PASSWORD = 'DemoPass123!';

async function main(): Promise<void> {
  const registerRes = await apiPost<RegisterResponse>('/api/auth/register', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    firstName: 'Demo',
    lastName: 'User',
  });
  if (registerRes.status === 201) {
    console.log(`[seed] usuario demo creado: ${registerRes.body.userId}`);
  } else if (registerRes.status === 409) {
    console.log('[seed] el usuario demo ya existía, se reutiliza');
  } else {
    throw new Error(`[seed] registro falló inesperadamente: HTTP ${registerRes.status}`);
  }

  const loginRes = await apiPost<LoginResponse>('/api/auth/login', {
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
  });
  if (loginRes.status !== 200) {
    throw new Error(`[seed] login falló: HTTP ${loginRes.status}`);
  }
  const accessToken = loginRes.body.accessToken;

  const meRes = await apiGet<CustomerResponse>('/api/customers/me', { token: accessToken });
  if (meRes.status === 200) {
    const customerId = meRes.body.id;
    const accountsRes = await apiGet<AccountResponse[]>(`/api/accounts/customer/${customerId}`, {
      token: accessToken,
    });
    console.log(
      `[seed] ya existía: customerId=${customerId}, ${accountsRes.body.length} cuenta(s). Nada más que hacer.`,
    );
    return;
  }

  console.log('[seed] no hay cliente todavía, corriendo el flujo completo...');

  const userId =
    registerRes.status === 201
      ? registerRes.body.userId
      : (await apiGet<MeResponse>('/api/auth/me', { token: accessToken })).body.userId;

  const createCustomerRes = await apiPost<CustomerResponse>(
    '/api/customers',
    {
      userId,
      email: DEMO_EMAIL,
      firstName: 'Demo',
      lastName: 'User',
      phoneNumber: '+34600000000',
      country: 'ES',
    },
    { token: accessToken },
  );
  if (createCustomerRes.status !== 201) {
    throw new Error(`[seed] alta de cliente falló: HTTP ${createCustomerRes.status}`);
  }

  const customerRes = await apiGet<CustomerResponse>('/api/customers/me', { token: accessToken });
  const customerId = customerRes.body.id;
  console.log(`[seed] cliente creado: ${customerId}`);

  const kycRes = await apiPost<CustomerResponse>(`/api/customers/${customerId}/verify-kyc`, undefined, {
    token: accessToken,
  });
  if (kycRes.status !== 200) {
    throw new Error(`[seed] verificación KYC falló: HTTP ${kycRes.status}`);
  }
  console.log('[seed] KYC verificado');

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
  const accountAId = accountA.body.id;
  console.log(`[seed] cuenta CHECKING abierta: ${accountAId}`);

  const accountB = await openAccount('SAVINGS');
  const accountBId = accountB.body.id;
  console.log(`[seed] cuenta SAVINGS abierta: ${accountBId}`);

  await pollUntil(
    () =>
      apiPost(
        '/api/ledger/deposit',
        { accountId: accountAId, amount: 1000.0, currency: 'EUR', description: 'Fondeo de demo' },
        { token: accessToken, headers: { 'Idempotency-Key': `seed-dep-${accountAId}` } },
      ),
    (res) => res.status === 200,
    { timeoutMs: 20_000, intervalMs: 1_000, description: 'depósito de demo' },
  );
  console.log('[seed] depósito de 1000.00 EUR en la cuenta CHECKING');

  const idempotencyKey = `seed-pay-${accountAId}`;
  const transferRes = await apiPost<PaymentResponse>(
    '/api/payments/transfer',
    {
      idempotencyKey,
      sourceAccountId: accountAId,
      targetAccountId: accountBId,
      amount: 25_000,
      currency: 'EUR',
      description: 'Transferencia de demo',
    },
    { token: accessToken, headers: { 'Idempotency-Key': idempotencyKey } },
  );
  if (transferRes.status !== 201) {
    throw new Error(`[seed] transferencia falló: HTTP ${transferRes.status}`);
  }
  const paymentId = transferRes.body.id;

  const finalPayment = await pollUntil(
    () => apiGet<PaymentResponse>(`/api/payments/${paymentId}`, { token: accessToken }),
    (res) => res.body.status === 'COMPLETED' || res.body.status === 'FAILED',
    { timeoutMs: 60_000, intervalMs: 1_000, description: 'saga de pago de demo' },
  );
  console.log(`[seed] transferencia de 250.00 EUR: ${finalPayment.body.status}`);

  console.log(
    `[seed] listo. customerId=${customerId} accountA=${accountAId} accountB=${accountBId} payment=${paymentId}`,
  );
}

main().catch((err) => {
  console.error('[seed] falló:', err);
  process.exit(1);
});
