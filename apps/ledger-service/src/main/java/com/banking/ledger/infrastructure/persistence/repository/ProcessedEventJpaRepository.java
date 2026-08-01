package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.infrastructure.persistence.entity.ProcessedEventJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedEventJpaRepository extends JpaRepository<ProcessedEventJpaEntity, String> {
}
