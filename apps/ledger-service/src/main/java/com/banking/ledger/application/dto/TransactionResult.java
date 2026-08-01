package com.banking.ledger.application.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record TransactionResult(
        String journalEntryId,
        String transactionId,
        String entryType,
        String status,
        BigDecimal amount,
        String currency,
        List<LedgerEntryResult> entries,
        Instant createdAt
) {

    public record LedgerEntryResult(
            String accountId,
            String type,
            BigDecimal amount,
            String currency
    ) {}
}
