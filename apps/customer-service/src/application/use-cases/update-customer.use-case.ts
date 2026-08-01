import { Injectable, Inject } from '@nestjs/common';
import { CustomerId } from '../../domain/value-objects/customer-id.vo';
import { Email } from '../../domain/value-objects/email.vo';
import { Address } from '../../domain/value-objects/address.vo';
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
import { CustomerNotFoundException } from '../../domain/exceptions/customer-exceptions';
import { UpdateCustomerInput, CustomerResponse, toCustomerResponse } from '../dto';
import { buildEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly repo: CustomerRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
  ) {}

  async execute(input: UpdateCustomerInput): Promise<CustomerResponse> {
    const id = CustomerId.fromPlain(input.id);
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundException(input.id);

    if (input.email) customer.updateEmail(Email.fromPlain(input.email));
    if (input.firstName) customer.updateFirstName(input.firstName);
    if (input.lastName) customer.updateLastName(input.lastName);
    if (input.phoneNumber !== undefined) customer.updatePhone(input.phoneNumber);

    if (
      input.street !== undefined ||
      input.city !== undefined ||
      input.country !== undefined ||
      input.postalCode !== undefined
    ) {
      customer.updateAddress(
        Address.fromPlain(
          input.street ?? customer.address.street,
          input.city ?? customer.address.city,
          input.country ?? customer.address.country,
          input.postalCode ?? customer.address.postalCode,
        ),
      );
    }

    const updatedAt = new Date();
    const changedFields = customer.updatedFields;

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(customer, ctx);

      if (changedFields.length > 0) {
        const envelope = buildEventEnvelope({
          eventType: 'CustomerContactUpdated',
          subjectId: customer.id.value,
          data: {
            customerId: customer.id.value,
            changedFields,
            updatedAt: updatedAt.toISOString(),
          },
        });
        await this.outbox.save(
          OutboxEvent.pending(
            customer.id.value,
            'CustomerContactUpdated',
            JSON.stringify(envelope),
          ),
          ctx,
        );
      }
    });

    return toCustomerResponse(customer);
  }
}
