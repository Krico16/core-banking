package com.banking.ledger.application.service;

import com.banking.ledger.application.dto.TransactionResult;
import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.vo.Money;

import java.util.List;

public final class TransactionResultMapper {

    private TransactionResultMapper() {}

    public static TransactionResult from(JournalEntry entry) {
        Money amount = entry.totalAmount();
        List<TransactionResult.LedgerEntryResult> entryResults = entry.getEntries().stream()
                .map(e -> new TransactionResult.LedgerEntryResult(
                        e.getAccountId(),
                        e.getType().name(),
                        e.getAmount().amount(),
                        e.getAmount().currency()
                ))
                .toList();

        return new TransactionResult(
                entry.getId().toString(),
                entry.getTransactionId(),
                entry.getEntryType().name(),
                entry.getStatus().name(),
                amount.amount(),
                amount.currency(),
                entryResults,
                entry.getCreatedAt()
        );
    }
}
