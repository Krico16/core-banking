package com.banking.ledger.application.service;

import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.model.LedgerEntry;
import com.banking.ledger.domain.port.OutboxEvent;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.Money;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EventEnvelopeFactoryTest {

    private EventEnvelopeFactory factory;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        factory = new EventEnvelopeFactory(objectMapper);
    }

    private JournalEntry makeJournalEntry() {
        JournalEntryId id = JournalEntryId.generate();
        LedgerAccountId sourceId = LedgerAccountId.generate();
        LedgerAccountId targetId = LedgerAccountId.generate();
        Money amount = Money.of(new BigDecimal("100.00"), "EUR");
        List<LedgerEntry> entries = List.of(
                LedgerEntry.debit(id.toString(), sourceId, "acc-source", amount),
                LedgerEntry.credit(id.toString(), targetId, "acc-target", amount)
        );
        return JournalEntry.create(id, "tx-1", EntryType.TRANSFER, IdempotencyKey.of("idem-1"), "test", entries);
    }

    @Test
    void transactionPosted_matchesLedgerTransactionPostedContract() throws Exception {
        JournalEntry entry = makeJournalEntry();
        Money amount = Money.of(new BigDecimal("100.00"), "EUR");

        OutboxEvent event = factory.transactionPosted(
                entry, amount, "acc-source", "corr-1", "acc-source", "acc-target", "pay_123"
        );

        assertEquals("LedgerTransactionPosted", event.eventType());
        JsonNode envelope = objectMapper.readTree(event.payload());
        JsonNode data = envelope.get("data");

        assertEquals(entry.getId().toString(), data.get("entryId").asText());
        assertEquals("pay_123", data.get("paymentId").asText());
        assertEquals("acc-source", data.get("sourceAccountId").asText());
        assertEquals("acc-target", data.get("targetAccountId").asText());
        assertEquals(10000, data.get("amount").asLong());
        assertEquals("EUR", data.get("currency").asText());
        assertEquals("TRANSFER", data.get("entryType").asText());
        assertTrue(data.get("entries").isArray());
        assertEquals(2, data.get("entries").size());
        assertEquals("acc-source", data.get("entries").get(0).get("accountId").asText());
        assertEquals(10000, data.get("entries").get(0).get("amount").asLong());
    }

    @Test
    void transactionPosted_allowsNullPaymentIdForDirectDepositWithdraw() throws Exception {
        JournalEntry entry = makeJournalEntry();
        Money amount = Money.of(new BigDecimal("50.00"), "EUR");

        OutboxEvent event = factory.transactionPosted(
                entry, amount, "acc-1", "corr-1", "BANK_CASH_EUR", "acc-1", null
        );

        JsonNode data = objectMapper.readTree(event.payload()).get("data");
        assertTrue(data.get("paymentId").isNull());
    }

    @Test
    void accountBalanceChanged_matchesContract() throws Exception {
        OutboxEvent event = factory.accountBalanceChanged(
                "acc-1", 1000L, 1500L, "EUR", "entry-1", Instant.parse("2026-01-01T00:00:00Z")
        );

        assertEquals("AccountBalanceChanged", event.eventType());
        JsonNode data = objectMapper.readTree(event.payload()).get("data");
        assertEquals("acc-1", data.get("accountId").asText());
        assertEquals(1000L, data.get("previousBalance").asLong());
        assertEquals(1500L, data.get("newBalance").asLong());
        assertEquals(500L, data.get("delta").asLong());
        assertEquals("EUR", data.get("currency").asText());
        assertEquals("entry-1", data.get("entryId").asText());
    }

    @Test
    void transactionRejected_matchesContract() throws Exception {
        OutboxEvent event = factory.transactionRejected("acc-1", "idem-1", "Insufficient funds");

        assertEquals("LedgerTransactionRejected", event.eventType());
        JsonNode data = objectMapper.readTree(event.payload()).get("data");
        assertEquals("acc-1", data.get("accountId").asText());
        assertEquals("idem-1", data.get("idempotencyKey").asText());
        assertEquals("Insufficient funds", data.get("reason").asText());
    }
}
