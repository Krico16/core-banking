package com.banking.ledger.infrastructure.messaging;

import com.banking.ledger.infrastructure.persistence.entity.OutboxEventJpaEntity;
import com.banking.ledger.infrastructure.persistence.repository.OutboxEventJpaRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Component
public class OutboxPublisherWorker {

    private static final Logger log = LoggerFactory.getLogger(OutboxPublisherWorker.class);
    private static final int MAX_RETRIES = 10;
    private static final long SEND_TIMEOUT_SECONDS = 5;

    private final OutboxEventJpaRepository outboxRepository;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final String topic;
    private final int batchSize;

    public OutboxPublisherWorker(
            OutboxEventJpaRepository outboxRepository,
            KafkaTemplate<String, String> kafkaTemplate,
            @Value("${ledger.topics.ledger-events}") String topic,
            @Value("${ledger.outbox.batch-size:100}") int batchSize
    ) {
        this.outboxRepository = outboxRepository;
        this.kafkaTemplate = kafkaTemplate;
        this.topic = topic;
        this.batchSize = batchSize;
    }

    @Scheduled(fixedDelayString = "${ledger.outbox.poll-interval-ms:1000}")
    @Transactional
    public void publishPendingEvents() {
        List<OutboxEventJpaEntity> pending = outboxRepository.findPendingEventsForUpdate(batchSize, MAX_RETRIES);

        for (OutboxEventJpaEntity event : pending) {
            try {
                kafkaTemplate.send(topic, event.getAggregateId(), event.getPayload())
                        .get(SEND_TIMEOUT_SECONDS, TimeUnit.SECONDS);

                event.setStatus("PUBLISHED");
                event.setPublishedAt(Instant.now());
                event.setError(null);
                outboxRepository.save(event);
                log.debug("Published outbox event {} type={}", event.getId(), event.getEventType());
            } catch (Exception e) {
                int retries = event.getRetryCount() + 1;
                event.setRetryCount(retries);
                event.setError(truncate(e.getMessage(), 1000));
                if (retries >= MAX_RETRIES) {
                    event.setStatus("FAILED");
                    log.error("Outbox event {} permanently failed after {} retries", event.getId(), retries, e);
                } else {
                    log.warn("Outbox event {} publish failed (retry {}/{}): {}",
                            event.getId(), retries, MAX_RETRIES, e.getMessage());
                }
                outboxRepository.save(event);
            }
        }
    }

    private static String truncate(String value, int max) {
        if (value == null) {
            return null;
        }
        return value.length() <= max ? value : value.substring(0, max);
    }
}
