import { registerAs } from '@nestjs/config';

export default registerAs('redpanda', () => ({
  brokers: (process.env.REDPANDA_BROKERS || 'localhost:19092').split(',').map((b) => b.trim()),
  clientId: process.env.REDPANDA_CLIENT_ID || 'notification-service',
  topicPaymentEvents: process.env.REDPANDA_TOPIC_PAYMENT_EVENTS || 'banking.payment.events',
  topicAccountEvents: process.env.REDPANDA_TOPIC_ACCOUNT_EVENTS || 'banking.account.events',
  topicCustomerEvents: process.env.REDPANDA_TOPIC_CUSTOMER_EVENTS || 'banking.customer.events',
}));
