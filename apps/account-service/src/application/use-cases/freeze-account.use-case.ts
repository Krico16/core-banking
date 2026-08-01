import { Injectable, Inject } from '@nestjs/common';
import { AccountId } from '../../domain/value-objects/account-id.vo';
import { AccountRepository, ACCOUNT_REPOSITORY } from '../../domain/ports/account-repository.port';
import {
  OutboxEventRepository,
  OUTBOX_EVENT_REPOSITORY,
} from '../../domain/ports/outbox-event-repository.port';
import { TransactionRunner, TRANSACTION_RUNNER } from '../../domain/ports/transaction-runner.port';
import { OutboxEvent } from '../../domain/entities/outbox-event.entity';
import { AccountNotFoundException } from '../../domain/exceptions/account-exceptions';
import { AccountResponse, toAccountResponse } from '../dto';
import { buildEventEnvelope } from '../service/event-envelope.util';

@Injectable()
export class FreezeAccountUseCase {
  constructor(
    @Inject(ACCOUNT_REPOSITORY) private readonly repo: AccountRepository,
    @Inject(OUTBOX_EVENT_REPOSITORY) private readonly outbox: OutboxEventRepository,
    @Inject(TRANSACTION_RUNNER) private readonly txRunner: TransactionRunner,
  ) {}

  async execute(accountId: string, reason: string): Promise<AccountResponse> {
    const id = AccountId.fromPlain(accountId);
    const account = await this.repo.findById(id);
    if (!account) throw new AccountNotFoundException(accountId);

    account.freeze();
    const frozenAt = new Date();

    const envelope = buildEventEnvelope({
      eventType: 'AccountFrozen',
      subjectId: account.id.value,
      data: {
        accountId: account.id.value,
        reason,
        frozenAt: frozenAt.toISOString(),
      },
    });

    await this.txRunner.run(async (ctx) => {
      await this.repo.save(account, ctx);
      await this.outbox.save(
        OutboxEvent.pending(account.id.value, 'AccountFrozen', JSON.stringify(envelope)),
        ctx,
      );
    });

    return toAccountResponse(account);
  }
}
