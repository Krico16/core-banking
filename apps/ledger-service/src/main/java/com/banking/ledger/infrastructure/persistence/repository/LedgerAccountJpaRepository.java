package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.infrastructure.persistence.entity.LedgerAccountJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LedgerAccountJpaRepository extends JpaRepository<LedgerAccountJpaEntity, String> {

    Optional<LedgerAccountJpaEntity> findByAccountId(String accountId);
}
