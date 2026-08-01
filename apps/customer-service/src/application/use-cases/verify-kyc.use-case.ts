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
  KycAlreadyVerifiedException,
} from '../../domain/exceptions/customer-exceptions';
import { CustomerResponse, toCustomerResponse } from '../dto';
import { buildEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class VerifyKycUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly repo: CustomerRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
  ) {}

  async execute(customerId: string): Promise<CustomerResponse> {
    const id = CustomerId.fromPlain(customerId);
    const customer = await this.repo.findById(id);
    if (!customer) throw new CustomerNotFoundException(customerId);
    if (customer.isKycVerified()) throw new KycAlreadyVerifiedException();

    customer.verifyKyc();
    const verifiedAt = new Date();

    const envelope = buildEventEnvelope({
      eventType: 'CustomerVerified',
      subjectId: customer.id.value,
      data: {
        customerId: customer.id.value,
        verifiedAt: verifiedAt.toISOString(),
        verificationMethod: 'DOCUMENT',
      },
    });

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(customer, ctx);
      await this.outbox.save(
        OutboxEvent.pending(customer.id.value, 'CustomerVerified', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toCustomerResponse(customer);
  }
}
