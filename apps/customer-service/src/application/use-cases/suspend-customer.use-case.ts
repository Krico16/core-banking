import { Injectable, Inject } from '@nestjs/common';
import { CustomerId } from '../../domain/value-objects/customer-id.vo';
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
import {
  CustomerNotFoundException,
  CustomerAlreadySuspendedException,
} from '../../domain/exceptions/customer-exceptions';
import { CustomerResponse, toCustomerResponse } from '../dto';
import { buildEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class SuspendCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly repo: CustomerRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
  ) {}

  async execute(customerId: string, reason: string): Promise<CustomerResponse> {
    const id = CustomerId.fromPlain(customerId);
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundException(customerId);
    if (customer.isSuspended()) throw new CustomerAlreadySuspendedException();

    customer.suspend();
    const suspendedAt = new Date();

    const envelope = buildEventEnvelope({
      eventType: 'CustomerSuspended',
      subjectId: customer.id.value,
      data: {
        customerId: customer.id.value,
        reason,
        suspendedAt: suspendedAt.toISOString(),
      },
    });

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(customer, ctx);
      await this.outbox.save(
        OutboxEvent.pending(customer.id.value, 'CustomerSuspended', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toCustomerResponse(customer);
  }
}
