package com.banking.ledger.application.service;

import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.model.LedgerEntry;
import com.banking.ledger.domain.port.OutboxEvent;
import com.banking.ledger.domain.vo.Money;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.f4b6a3.ulid.UlidCreator;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Component
public class EventEnvelopeFactory {

    private static final String PRODUCER = "ledger-service";
    private static final int EVENT_VERSION = 1;

    private final ObjectMapper objectMapper;

    public EventEnvelopeFactory(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    /** Shape matches contracts/json-schema/events/ledger-transaction-posted.json. */
    public OutboxEvent transactionPosted(
            JournalEntry entry,
            Money amount,
            String subjectId,
            String correlationId,
            String sourceAccountId,
            String targetAccountId,
            String paymentId
    ) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("entryId", entry.getId().toString());
        data.put("paymentId", paymentId);
        data.put("sourceAccountId", sourceAccountId);
        data.put("targetAccountId", targetAccountId);
        data.put("amount", amount.toCents());
        data.put("currency", amount.currency());
        data.put("entryType", entry.getEntryType().name());
        data.put("entries", toEntryMaps(entry.getEntries()));
        data.put("postedAt", entry.getCreatedAt().toString());

        return pending(
                entry.getId().toString(),
                "LedgerTransactionPosted",
                subjectId,
                correlationId,
                entry.getId().toString(),
                entry.getCreatedAt(),
                data
        );
    }

    /** Shape matches contracts/json-schema/events/balance-changed.json. */
    public OutboxEvent accountBalanceChanged(
            String accountId,
            long previousBalanceCents,
            long newBalanceCents,
            String currency,
            String entryId,
            Instant changedAt
    ) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accountId", accountId);
        data.put("previousBalance", previousBalanceCents);
        data.put("newBalance", newBalanceCents);
        data.put("delta", newBalanceCents - previousBalanceCents);
        data.put("currency", currency);
        data.put("entryId", entryId);
        data.put("changedAt", changedAt.toString());

        return pending(accountId, "AccountBalanceChanged", accountId, null, entryId, changedAt, data);
    }

    /** Emitted (own outbox transaction, see RejectionRecorder) when a posting attempt
     * fails domain validation — no journal entry exists for a rejected attempt. */
    public OutboxEvent transactionRejected(String accountId, String idempotencyKey, String reason) {
        Instant now = Instant.now();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("accountId", accountId);
        data.put("idempotencyKey", idempotencyKey);
        data.put("reason", reason);
        data.put("rejectedAt", now.toString());

        return pending(accountId, "LedgerTransactionRejected", accountId, null, null, now, data);
    }

    public OutboxEvent transactionReversed(
            JournalEntry original,
            JournalEntry reversal,
            String reason,
            String correlationId
    ) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("originalEntryId", original.getId().toString());
        data.put("reversalEntryId", reversal.getId().toString());
        data.put("transactionId", original.getTransactionId());
        data.put("reason", reason != null ? reason : "Reversal");
        data.put("reversedAt", reversal.getCreatedAt().toString());
        data.put("entries", toEntryMaps(reversal.getEntries()));

        return pending(
                original.getId().toString(),
                "LedgerTransactionReversed",
                original.getId().toString(),
                correlationId,
                reversal.getId().toString(),
                reversal.getCreatedAt(),
                data
        );
    }

    private OutboxEvent pending(
            String aggregateId,
            String eventType,
            String subjectId,
            String correlationId,
            String causationId,
            Instant occurredAt,
            Map<String, Object> data
    ) {
        String eventId = UlidCreator.getUlid().toString();
        Map<String, Object> envelope = new LinkedHashMap<>();
        envelope.put("eventId", eventId);
        envelope.put("eventType", eventType);
        envelope.put("eventVersion", EVENT_VERSION);
        envelope.put("occurredAt", occurredAt.toString());
        envelope.put("producer", PRODUCER);
        envelope.put("correlationId", correlationId != null ? correlationId : eventId);
        envelope.put("causationId", causationId != null ? causationId : eventId);
        envelope.put("subjectId", subjectId);
        envelope.put("data", data);

        try {
            return OutboxEvent.pending(aggregateId, eventType, objectMapper.writeValueAsString(envelope));
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize event envelope", e);
        }
    }

    private List<Map<String, Object>> toEntryMaps(List<LedgerEntry> entries) {
        return entries.stream()
                .map(e -> {
                    Map<String, Object> map = new LinkedHashMap<>();
                    map.put("accountId", e.getAccountId());
                    map.put("type", e.getType().name());
                    map.put("amount", e.getAmount().toCents());
                    map.put("currency", e.getAmount().currency());
                    return map;
                })
                .toList();
    }
}
