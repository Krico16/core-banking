import { registerAs } from '@nestjs/config';

export interface ProxyRouteConfig {
  /** Path prefix mounted on the gateway, e.g. '/api/accounts'. */
  prefix: string;
  /** Base URL of the downstream service. */
  target: string;
  /** Optional http-proxy-middleware pathRewrite map. */
  pathRewrite?: Record<string, string>;
}

export default registerAs(
  'routes',
  (): ProxyRouteConfig[] => [
    { prefix: '/api/auth', target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001' },
    {
      prefix: '/api/customers',
      target: process.env.CUSTOMER_SERVICE_URL || 'http://localhost:3002',
    },
    {
      prefix: '/api/accounts',
      target: process.env.ACCOUNT_SERVICE_URL || 'http://localhost:3003',
    },
    { prefix: '/api/ledger', target: process.env.LEDGER_SERVICE_URL || 'http://localhost:3004' },
    {
      prefix: '/api/payments',
      target: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    },
    {
      prefix: '/api/notifications',
      target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    },
    {
      // Namespace propio para evitar colisión con /api/accounts y /api/payments
      // de escritura: query-service es una proyección CQRS eventualmente
      // consistente, expuesta aparte y reescrita a la ruta real del servicio.
      prefix: '/api/query',
      target: process.env.QUERY_SERVICE_URL || 'http://localhost:3008',
      pathRewrite: { '^/api/query': '/api' },
    },
  ],
);
