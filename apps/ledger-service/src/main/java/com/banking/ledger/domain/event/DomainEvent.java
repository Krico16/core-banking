package com.banking.ledger.domain.event;

import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.vo.Money;

import java.time.Instant;

public sealed interface DomainEvent {

    String eventType();
    String aggregateId();
    Instant occurredAt();

    record LedgerTransactionPosted(
            JournalEntry journalEntry,
            Instant occurredAt
    ) implements DomainEvent {
        @Override public String eventType() { return "LedgerTransactionPosted"; }
        @Override public String aggregateId() { return journalEntry.getId().toString(); }
    }

    record LedgerTransactionRejected(
            String transactionId,
            String reason,
            Instant occurredAt
    ) implements DomainEvent {
        @Override public String eventType() { return "LedgerTransactionRejected"; }
        @Override public String aggregateId() { return transactionId; }
    }

    record LedgerTransactionReversed(
            JournalEntry originalEntry,
            JournalEntry reversalEntry,
            String reason,
            Instant occurredAt
    ) implements DomainEvent {
        @Override public String eventType() { return "LedgerTransactionReversed"; }
        @Override public String aggregateId() { return originalEntry.getId().toString(); }
    }

    record AccountBalanceChanged(
            String accountId,
            Money previousBalance,
            Money newBalance,
            Money delta,
            Instant occurredAt
    ) implements DomainEvent {
        @Override public String eventType() { return "AccountBalanceChanged"; }
        @Override public String aggregateId() { return accountId; }
    }

    record FundsHeld(
            String accountId,
            String holdId,
            Money amount,
            Instant occurredAt
    ) implements DomainEvent {
        @Override public String eventType() { return "FundsHeld"; }
        @Override public String aggregateId() { return accountId; }
    }

    record FundsReleased(
            String accountId,
            String holdId,
            Money amount,
            Instant occurredAt
    ) implements DomainEvent {
        @Override public String eventType() { return "FundsReleased"; }
        @Override public String aggregateId() { return accountId; }
    }
}
