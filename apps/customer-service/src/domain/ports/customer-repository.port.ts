import { Customer } from '../entities/customer.entity';
import { CustomerId } from '../value-objects/customer-id.vo';
import { TransactionContext } from './transaction-runner.port';

export interface CustomerRepository {
  findById(id: CustomerId): Promise<Customer | null>;
  findByUserId(userId: string): Promise<Customer | null>;
  save(customer: Customer, ctx?: TransactionContext): Promise<void>;
}

export const CUSTOMER_REPOSITORY = Symbol('CUSTOMER_REPOSITORY');
