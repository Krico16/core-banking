import { Injectable, Inject } from '@nestjs/common';
import { Customer } from '../../domain/entities/customer.entity';
import { Email } from '../../domain/value-objects/email.vo';
import {
  CustomerRepository,
  CUSTOMER_REPOSITORY,
} from '../../domain/ports/customer-repository.port';
import {
  OutboxEventRepository,
  OUTBOX_EVENT_REPOSITORY,
} from '../../domain/ports/outbox-event-repository.port';
import { TransactionRunner, TRANSACTION_RUNNER } from '../../domain/ports/transaction-runner.port';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { DuplicateCustomerException } from '../../domain/exceptions/customer-exceptions';
import { RegisterCustomerInput, CustomerResponse, toCustomerResponse } from '../dto';
import { buildEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class RegisterCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly repo: CustomerRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
  ) {}

  async execute(input: RegisterCustomerInput): Promise<CustomerResponse> {
    const existingByUser = await this.repo.findByUserId(input.userId);
    if (existingByUser) throw new DuplicateCustomerException('user');

    const email = Email.fromPlain(input.email);

    const customer = Customer.register({
      userId: input.userId,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      phoneNumber: input.phoneNumber,
      country: input.country,
    });

    const envelope = buildEventEnvelope({
      eventType: 'CustomerRegistered',
      subjectId: customer.id.value,
      data: {
        customerId: customer.id.value,
        userId: customer.userId,
        email: customer.email.value,
        firstName: customer.firstName,
        lastName: customer.lastName,
        country: customer.address.country,
      },
    });

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(customer, ctx);
      await this.outbox.save(
        OutboxEvent.pending(customer.id.value, 'CustomerRegistered', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toCustomerResponse(customer);
  }
}
