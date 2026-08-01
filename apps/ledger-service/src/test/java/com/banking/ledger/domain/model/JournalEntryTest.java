package com.banking.ledger.domain.model;

import com.banking.ledger.domain.exception.TransactionAlreadyReversedException;
import com.banking.ledger.domain.exception.UnbalancedEntryException;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.domain.vo.JournalEntryStatus;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.Money;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class JournalEntryTest {

    @Test
    void create_rejectsUnbalanced() {
        JournalEntryId id = JournalEntryId.generate();
        LedgerAccountId a = LedgerAccountId.generate();
        LedgerAccountId b = LedgerAccountId.generate();
        List<LedgerEntry> entries = List.of(
                LedgerEntry.debit(id.toString(), a, "acc_a", Money.ofPositive(new BigDecimal("100"), "EUR")),
                LedgerEntry.credit(id.toString(), b, "acc_b", Money.ofPositive(new BigDecimal("50"), "EUR"))
        );

        assertThrows(UnbalancedEntryException.class, () ->
                JournalEntry.create(id, "tx1", EntryType.DEPOSIT, IdempotencyKey.of("k1"), "desc", entries));
    }

    @Test
    void create_acceptsBalancedAndKeepsId() {
        JournalEntryId id = JournalEntryId.generate();
        LedgerAccountId a = LedgerAccountId.generate();
        LedgerAccountId b = LedgerAccountId.generate();
        Money amount = Money.ofPositive(new BigDecimal("100"), "EUR");
        List<LedgerEntry> entries = List.of(
                LedgerEntry.debit(id.toString(), a, "acc_a", amount),
                LedgerEntry.credit(id.toString(), b, "acc_b", amount)
        );

        JournalEntry entry = JournalEntry.create(
                id, "tx1", EntryType.DEPOSIT, IdempotencyKey.of("k2"), "deposit", entries
        );

        assertEquals(id.toString(), entry.getId().toString());
        assertEquals(JournalEntryStatus.POSTED, entry.getStatus());
        assertEquals(amount.amount(), entry.totalAmount().amount());
        assertTrue(entry.getEntries().stream().allMatch(e -> e.getJournalEntryId().equals(id.toString())));
    }

    @Test
    void reverse_twiceFails() {
        JournalEntryId id = JournalEntryId.generate();
        LedgerAccountId a = LedgerAccountId.generate();
        LedgerAccountId b = LedgerAccountId.generate();
        Money amount = Money.ofPositive(new BigDecimal("10"), "EUR");
        JournalEntry entry = JournalEntry.create(
                id, "tx1", EntryType.DEPOSIT, IdempotencyKey.of("k3"), "d",
                List.of(
                        LedgerEntry.debit(id.toString(), a, "acc_a", amount),
                        LedgerEntry.credit(id.toString(), b, "acc_b", amount)
                )
        );

        entry.reverse("rev-1");
        assertEquals(JournalEntryStatus.REVERSED, entry.getStatus());
        assertThrows(TransactionAlreadyReversedException.class, () -> entry.reverse("rev-2"));
    }
}
