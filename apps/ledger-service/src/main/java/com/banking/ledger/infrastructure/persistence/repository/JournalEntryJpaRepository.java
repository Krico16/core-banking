package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.infrastructure.persistence.entity.JournalEntryJpaEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.Optional;

@Repository
public interface JournalEntryJpaRepository extends JpaRepository<JournalEntryJpaEntity, String> {

    Optional<JournalEntryJpaEntity> findByIdempotencyKey(String idempotencyKey);

    /** Double-entry invariant (regla nº1 de AGENTS.md): Σ débitos = Σ créditos siempre.
     * Backs the banking_ledger_balance_imbalance gauge (see LedgerBalanceMetrics). */
    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE entry_type = 'DEBIT'", nativeQuery = true)
    BigDecimal sumDebits();

    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM ledger_entries WHERE entry_type = 'CREDIT'", nativeQuery = true)
    BigDecimal sumCredits();
}
