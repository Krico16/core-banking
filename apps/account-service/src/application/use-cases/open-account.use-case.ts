import { Injectable, Inject } from '@nestjs/common';
import { Account } from '../../domain/entities/account.entity';
import { AccountType } from '../../domain/value-objects/account-type.vo';
import { Currency } from '../../domain/value-objects/currency.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { AccountRepository, ACCOUNT_REPOSITORY } from '../../domain/ports/account-repository.port';
import {
  OutboxEventRepository,
  OUTBOX_EVENT_REPOSITORY,
} from '../../domain/ports/outbox-event-repository.port';
import { TransactionRunner, TRANSACTION_RUNNER } from '../../domain/ports/transaction-runner.port';
import {
  CustomerVerificationRepository,
  CUSTOMER_VERIFICATION_REPOSITORY,
} from '../../domain/ports/customer-verification-repository.port';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { CustomerNotVerifiedException } from '../../domain/exceptions/account-exceptions';
import { OpenAccountInput, AccountResponse, toAccountResponse } from '../dto';
import { buildEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class OpenAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly repo: AccountRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
    @Inject(CUSTOMER_VERIFICATION_REPOSITORY)
    private readonly verification: CustomerVerificationRepository,
  ) {}

  async execute(input: OpenAccountInput): Promise<AccountResponse> {
    const isVerified = await this.verification.isVerified(input.customerId);
    if (!isVerified) {
      throw new CustomerNotVerifiedException(input.customerId);
    }

    const accountType = AccountType.fromPlain(input.accountType);
    const currency = Currency.fromPlain(input.currency).value;

    const account = Account.open({
      customerId: input.customerId,
      accountType,
      currency,
      dailyLimit: Money.fromPlain(input.dailyLimitAmount, currency),
      transactionLimit: Money.fromPlain(input.transactionLimitAmount, currency),
    });

    const envelope = buildEventEnvelope({
      eventType: 'AccountOpened',
      subjectId: account.id.value,
      data: {
        accountId: account.id.value,
        customerId: account.customerId,
        accountNumber: account.accountNumber.value,
        accountType: account.accountType.value,
        currency: account.currency,
        openedAt: new Date().toISOString(),
      },
    });

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(account, ctx);
      await this.outbox.save(
        OutboxEvent.pending(account.id.value, 'AccountOpened', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toAccountResponse(account);
  }
}
