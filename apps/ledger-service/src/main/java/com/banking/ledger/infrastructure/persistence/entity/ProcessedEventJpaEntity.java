package com.banking.ledger.infrastructure.persistence.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "processed_events")
public class ProcessedEventJpaEntity {

    @Id
    @Column(name = "event_id", length = 26)
    private String eventId;

    @Column(name = "consumer_name", length = 100, nullable = false)
    private String consumerName;

    @Column(name = "processed_at", nullable = false)
    private Instant processedAt;

    protected ProcessedEventJpaEntity() {
    }

    public ProcessedEventJpaEntity(String eventId, String consumerName) {
        this.eventId = eventId;
        this.consumerName = consumerName;
        this.processedAt = Instant.now();
    }

    public String getEventId() {
        return eventId;
    }

    public String getConsumerName() {
        return consumerName;
    }

    public Instant getProcessedAt() {
        return processedAt;
    }
}
