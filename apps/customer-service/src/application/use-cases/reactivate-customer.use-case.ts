import { Injectable, Inject } from '@nestjs/common';
import { CustomerId } from '../../domain/value-objects/customer-id.vo';
import { CustomerRepository, CUSTOMER_REPOSITORY } from '../../domain/ports/customer-repository.port';
import { CustomerNotFoundException } from '../../domain/exceptions/customer-exceptions';
import { CustomerResponse, toCustomerResponse } from '../dto';

@Injectable()
export class ReactivateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly repo: CustomerRepository,
  ) {}

  async execute(customerId: string): Promise<CustomerResponse> {
    const id = CustomerId.fromPlain(customerId);
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundException(customerId);

    customer.reactivate();
    await this.repo.save(customer);

    return toCustomerResponse(customer);
  }
}
