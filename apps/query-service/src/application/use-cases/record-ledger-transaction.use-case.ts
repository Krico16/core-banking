import { Inject, Injectable } from '@nestjs/common';
import { TransactionView } from '../../domain/entities/transaction-view.entity';
import {
  TransactionViewRepository,
  TRANSACTION_VIEW_REPOSITORY,
} from '../../domain/ports/transaction-view-repository.port';
import { RecordLedgerTransactionInput } from '../dto/record-ledger-transaction.input';
import { findCounterpartAccount } from '../services/find-counterpart-account';

@Injectable()
export class RecordLedgerTransactionUseCase {
  constructor(
    @Inject(TRANSACTION_VIEW_REPOSITORY) private readonly repo: TransactionViewRepository,
  ) {}

  /** Una línea de entries[] = un movimiento en el extracto de esa cuenta. Con las
   * 2 líneas habituales (debit+credit), la otra línea es la contraparte; con más de
   * 2 (no ocurre hoy, pero el código no debe asumirlo) queda sin contraparte. */
  async execute(input: RecordLedgerTransactionInput): Promise<void> {
    const alreadyRecorded = await this.repo.findByEntryId(input.entryId);
    if (alreadyRecorded.length > 0) return;

    const postedAt = new Date(input.postedAt);

    for (const entry of input.entries) {
      const counterpart = findCounterpartAccount(entry, input.entries);
      const view = TransactionView.create({
        entryId: input.entryId,
        accountId: entry.accountId,
        counterpartAccountId: counterpart,
        direction: entry.type,
        amount: entry.amount,
        currency: entry.currency,
        entryType: input.entryType,
        postedAt,
      });
      await this.repo.save(view);
    }
  }
}
