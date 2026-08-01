import { Payment } from '../entities';
import { TransactionContext } from './transaction-runner.port';

export const PAYMENT_REPOSITORY = Symbol('PAYMENT_REPOSITORY');

export interface PaymentRepository {
  save(payment: Payment, ctx?: TransactionContext): Promise<void>;
  findById(id: string): Promise<Payment | null>;
  findByIdempotencyKey(key: string): Promise<Payment | null>;
  findByStatus(status: string): Promise<Payment[]>;
}
