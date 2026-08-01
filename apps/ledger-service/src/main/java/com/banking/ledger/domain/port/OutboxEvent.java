package com.banking.ledger.domain.port;

import java.time.Instant;

public record OutboxEvent(
        String id,
        String aggregateId,
        String eventType,
        String payload,
        String status,
        int retryCount,
        Instant createdAt,
        Instant publishedAt,
        String error
) {

    public static OutboxEvent pending(String aggregateId, String eventType, String payload) {
        return new OutboxEvent(
                com.github.f4b6a3.ulid.UlidCreator.getUlid().toString(),
                aggregateId,
                eventType,
                payload,
                "PENDING",
                0,
                Instant.now(),
                null,
                null
        );
    }

    public OutboxEvent markPublished() {
        return new OutboxEvent(id, aggregateId, eventType, payload, "PUBLISHED", retryCount, createdAt, Instant.now(), null);
    }

    public OutboxEvent markFailed(String error) {
        return new OutboxEvent(id, aggregateId, eventType, payload, "FAILED", retryCount + 1, createdAt, null, error);
    }
}
