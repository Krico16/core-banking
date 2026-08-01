package com.banking.ledger.infrastructure.messaging;

import com.banking.ledger.domain.event.DomainEvent;
import com.banking.ledger.domain.port.EventPublisher;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
public class KafkaEventPublisher implements EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(KafkaEventPublisher.class);

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;
    private final String topic;

    public KafkaEventPublisher(
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper,
            @Value("${ledger.topics.ledger-events}") String topic
    ) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
        this.topic = topic;
    }

    @Override
    public void publish(DomainEvent event) {
        try {
            Map<String, Object> envelope = new HashMap<>();
            envelope.put("eventId", com.github.f4b6a3.ulid.UlidCreator.getUlid().toString());
            envelope.put("eventType", event.eventType());
            envelope.put("eventVersion", 1);
            envelope.put("occurredAt", event.occurredAt().toString());
            envelope.put("producer", "ledger-service");
            envelope.put("correlationId", com.github.f4b6a3.ulid.UlidCreator.getUlid().toString());
            envelope.put("causationId", com.github.f4b6a3.ulid.UlidCreator.getUlid().toString());
            envelope.put("subjectId", event.aggregateId());
            envelope.put("data", extractData(event));

            String payload = objectMapper.writeValueAsString(envelope);
            kafkaTemplate.send(topic, event.aggregateId(), payload);
            log.info("Published event: {} for aggregate: {}", event.eventType(), event.aggregateId());
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize event: {}", event.eventType(), e);
            throw new RuntimeException("Failed to serialize event", e);
        }
    }

    private Map<String, Object> extractData(DomainEvent event) {
        if (event instanceof DomainEvent.LedgerTransactionPosted e) {
            return Map.of(
                    "entryId", e.journalEntry().getId().toString(),
                    "transactionId", e.journalEntry().getTransactionId(),
                    "entryType", e.journalEntry().getEntryType().name(),
                    "postedAt", e.journalEntry().getCreatedAt().toString()
            );
        }
        if (event instanceof DomainEvent.LedgerTransactionReversed e) {
            return Map.of(
                    "originalEntryId", e.originalEntry().getId().toString(),
                    "reversalEntryId", e.reversalEntry().getId().toString(),
                    "reason", e.reason(),
                    "reversedAt", e.occurredAt().toString()
            );
        }
        if (event instanceof DomainEvent.AccountBalanceChanged e) {
            return Map.of(
                    "accountId", e.accountId(),
                    "previousBalance", e.previousBalance().amount(),
                    "newBalance", e.newBalance().amount(),
                    "delta", e.delta().amount(),
                    "currency", e.newBalance().currency()
            );
        }
        return Map.of();
    }
}
