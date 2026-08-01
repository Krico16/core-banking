package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.infrastructure.persistence.entity.OutboxEventJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface OutboxEventJpaRepository extends JpaRepository<OutboxEventJpaEntity, String> {

    @Query(value = """
            SELECT * FROM outbox_events
            WHERE status = 'PENDING' AND retry_count < :maxRetries
            ORDER BY created_at
            LIMIT :batchSize
            FOR UPDATE SKIP LOCKED
            """, nativeQuery = true)
    List<OutboxEventJpaEntity> findPendingEventsForUpdate(
            @Param("batchSize") int batchSize,
            @Param("maxRetries") int maxRetries
    );
}
