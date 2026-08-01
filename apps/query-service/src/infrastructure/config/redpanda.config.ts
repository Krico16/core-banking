import { registerAs } from '@nestjs/config';

export default registerAs('redpanda', () => ({
  brokers: (process.env.REDPANDA_BROKERS || 'localhost:19092').split(',').map((b) => b.trim()),
  clientId: process.env.REDPANDA_CLIENT_ID || 'query-service',
  topicCustomerEvents: process.env.REDPANDA_TOPIC_CUSTOMER_EVENTS || 'banking.customer.events',
  topicAccountEvents: process.env.REDPANDA_TOPIC_ACCOUNT_EVENTS || 'banking.account.events',
  topicLedgerEvents: process.env.REDPANDA_TOPIC_LEDGER_EVENTS || 'banking.ledger.events',
  topicPaymentEvents: process.env.REDPANDA_TOPIC_PAYMENT_EVENTS || 'banking.payment.events',
}));
