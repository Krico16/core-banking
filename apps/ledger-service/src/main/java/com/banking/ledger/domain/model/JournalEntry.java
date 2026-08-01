package com.banking.ledger.domain.model;

import com.banking.ledger.domain.exception.TransactionAlreadyReversedException;
import com.banking.ledger.domain.exception.UnbalancedEntryException;
import com.banking.ledger.domain.vo.DebitCredit;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.domain.vo.JournalEntryStatus;
import com.banking.ledger.domain.vo.Money;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class JournalEntry {

    private final JournalEntryId id;
    private final String transactionId;
    private final EntryType entryType;
    private JournalEntryStatus status;
    private final IdempotencyKey idempotencyKey;
    private final String description;
    private final Instant createdAt;
    private Instant reversedAt;
    private String reversedByEntryId;
    private final List<LedgerEntry> entries;

    private JournalEntry(
            JournalEntryId id,
            String transactionId,
            EntryType entryType,
            JournalEntryStatus status,
            IdempotencyKey idempotencyKey,
            String description,
            Instant createdAt,
            Instant reversedAt,
            String reversedByEntryId,
            List<LedgerEntry> entries
    ) {
        this.id = id;
        this.transactionId = transactionId;
        this.entryType = entryType;
        this.status = status;
        this.idempotencyKey = idempotencyKey;
        this.description = description;
        this.createdAt = createdAt;
        this.reversedAt = reversedAt;
        this.reversedByEntryId = reversedByEntryId;
        this.entries = new ArrayList<>(entries);
    }

    public static JournalEntry create(
            JournalEntryId id,
            String transactionId,
            EntryType entryType,
            IdempotencyKey idempotencyKey,
            String description,
            List<LedgerEntry> entries
    ) {
        validateBalance(entries);
        return new JournalEntry(
                id,
                transactionId,
                entryType,
                JournalEntryStatus.POSTED,
                idempotencyKey,
                description,
                Instant.now(),
                null,
                null,
                entries
        );
    }

    public static JournalEntry reconstruct(
            JournalEntryId id,
            String transactionId,
            EntryType entryType,
            JournalEntryStatus status,
            IdempotencyKey idempotencyKey,
            String description,
            Instant createdAt,
            Instant reversedAt,
            String reversedByEntryId,
            List<LedgerEntry> entries
    ) {
        return new JournalEntry(
                id, transactionId, entryType, status, idempotencyKey,
                description, createdAt, reversedAt, reversedByEntryId, entries
        );
    }

    private static void validateBalance(List<LedgerEntry> entries) {
        if (entries == null || entries.size() < 2) {
            throw new UnbalancedEntryException("Journal entry must have at least 2 entries (debit and credit)");
        }

        boolean hasDebit = false;
        boolean hasCredit = false;
        String currency = null;
        BigDecimal totalDebits = BigDecimal.ZERO;
        BigDecimal totalCredits = BigDecimal.ZERO;

        for (LedgerEntry entry : entries) {
            Money amount = entry.getAmount();
            if (!amount.isPositive()) {
                throw new UnbalancedEntryException("All ledger lines must have positive amounts");
            }
            if (currency == null) {
                currency = amount.currency();
            } else if (!currency.equals(amount.currency())) {
                throw new UnbalancedEntryException("All ledger lines must share the same currency");
            }
            if (entry.getType() == DebitCredit.DEBIT) {
                hasDebit = true;
                totalDebits = totalDebits.add(amount.amount());
            } else {
                hasCredit = true;
                totalCredits = totalCredits.add(amount.amount());
            }
        }

        if (!hasDebit || !hasCredit) {
            throw new UnbalancedEntryException("Journal entry must include at least one debit and one credit");
        }

        if (totalDebits.compareTo(totalCredits) != 0) {
            throw new UnbalancedEntryException(
                    "Debits (" + totalDebits + ") != Credits (" + totalCredits + ")"
            );
        }
    }

    public Money totalAmount() {
        return entries.stream()
                .filter(e -> e.getType() == DebitCredit.DEBIT)
                .map(LedgerEntry::getAmount)
                .reduce(Money::add)
                .orElseThrow(() -> new UnbalancedEntryException("No debit lines"));
    }

    public void reverse(String reversalEntryId) {
        if (this.status == JournalEntryStatus.REVERSED) {
            throw new TransactionAlreadyReversedException(this.id.toString());
        }
        this.status = JournalEntryStatus.REVERSED;
        this.reversedAt = Instant.now();
        this.reversedByEntryId = reversalEntryId;
    }

    public JournalEntryId getId() { return id; }
    public String getTransactionId() { return transactionId; }
    public EntryType getEntryType() { return entryType; }
    public JournalEntryStatus getStatus() { return status; }
    public IdempotencyKey getIdempotencyKey() { return idempotencyKey; }
    public String getDescription() { return description; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getReversedAt() { return reversedAt; }
    public String getReversedByEntryId() { return reversedByEntryId; }
    public List<LedgerEntry> getEntries() { return Collections.unmodifiableList(entries); }
}
