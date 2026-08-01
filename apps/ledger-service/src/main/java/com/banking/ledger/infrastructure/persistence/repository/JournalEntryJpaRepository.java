package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.infrastructure.persistence.entity.JournalEntryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface JournalEntryJpaRepository extends JpaRepository<JournalEntryJpaEntity, String> {

    Optional<JournalEntryJpaEntity> findByIdempotencyKey(String idempotencyKey);
}
