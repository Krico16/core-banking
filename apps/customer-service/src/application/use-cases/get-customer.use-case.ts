import { Injectable, Inject } from '@nestjs/common';
import { CustomerId } from '../../domain/value-objects/customer-id.vo';
import { CustomerRepository, CUSTOMER_REPOSITORY } from '../../domain/ports/customer-repository.port';
import { CustomerNotFoundException } from '../../domain/exceptions/customer-exceptions';
import { CustomerResponse, toCustomerResponse } from '../dto';

@Injectable()
export class GetCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly repo: CustomerRepository,
  ) {}

  async byId(customerId: string): Promise<CustomerResponse> {
    const id = CustomerId.fromPlain(customerId);
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundException(customerId);
    return toCustomerResponse(customer);
  }

  async byUserId(userId: string): Promise<CustomerResponse> {
    const customer = await this.repo.findByUserId(userId);
    if (!customer) throw new CustomerNotFoundException(userId);
    return toCustomerResponse(customer);
  }
}
