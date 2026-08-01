import { Inject, Injectable } from '@nestjs/common';
import { TransactionView } from '../../domain/entities/transaction-view.entity';
import {
  TransactionViewRepository,
  TRANSACTION_VIEW_REPOSITORY,
} from '../../domain/ports/transaction-view-repository.port';
import { ReverseLedgerTransactionInput } from '../dto/reverse-ledger-transaction.input';
import { findCounterpartAccount } from '../services/find-counterpart-account';

@Injectable()
export class ReverseLedgerTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_VIEW_REPOSITORY) private readonly repo: TransactionViewRepository,
  ) {}

  async execute(input: ReverseLedgerTransactionInput): Promise<void> {
    const alreadyRecorded = await this.repo.findByEntryId(input.reversalEntryId);
    if (alreadyRecorded.length === 0) {
      const reversedAt = new Date(input.reversedAt);
      for (const entry of input.entries) {
        const counterpart = findCounterpartAccount(entry, input.entries);
        const view = TransactionView.create({
          entryId: input.reversalEntryId,
          accountId: entry.accountId,
          counterpartAccountId: counterpart,
          direction: entry.type,
          amount: entry.amount,
          currency: entry.currency,
          entryType: 'REVERSAL',
          postedAt: reversedAt,
        });
        await this.repo.save(view);
      }
    }

    const originalRows = await this.repo.findByEntryId(input.originalEntryId);
    for (const row of originalRows) {
      if (row.status === 'POSTED') {
        await this.repo.save(row.markReversed());
      }
    }
  }
}
