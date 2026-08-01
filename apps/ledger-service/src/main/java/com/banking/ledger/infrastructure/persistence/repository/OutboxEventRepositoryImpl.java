package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.domain.port.OutboxEvent;
import com.banking.ledger.domain.port.OutboxEventRepository;
import com.banking.ledger.infrastructure.persistence.entity.OutboxEventJpaEntity;
import org.springframework.stereotype.Repository;

@Repository
public class OutboxEventRepositoryImpl implements OutboxEventRepository {

    private final OutboxEventJpaRepository jpaRepository;

    public OutboxEventRepositoryImpl(OutboxEventJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public void save(OutboxEvent event) {
        OutboxEventJpaEntity entity = new OutboxEventJpaEntity();
        entity.setId(event.id());
        entity.setAggregateId(event.aggregateId());
        entity.setEventType(event.eventType());
        entity.setPayload(event.payload());
        entity.setStatus(event.status());
        entity.setRetryCount(event.retryCount());
        entity.setCreatedAt(event.createdAt());
        entity.setPublishedAt(event.publishedAt());
        entity.setError(event.error());
        jpaRepository.save(entity);
    }
}
