package com.banking.ledger.infrastructure.metrics;

import com.banking.ledger.infrastructure.persistence.repository.JournalEntryJpaRepository;
import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Exposes the double-entry invariant (Σ débitos = Σ créditos, regla nº1 de
 * AGENTS.md) as a Prometheus gauge — must read 0 at all times; any non-zero
 * value means the invariant was violated somewhere in the system.
 */
@Component
public class LedgerBalanceMetrics {

    private final JournalEntryJpaRepository repository;
    private final AtomicReference<Double> imbalance = new AtomicReference<>(0.0);

    public LedgerBalanceMetrics(JournalEntryJpaRepository repository, MeterRegistry registry) {
        this.repository = repository;
        Gauge.builder("banking_ledger_balance_imbalance", imbalance, AtomicReference::get)
                .description("Sum of all debits minus sum of all credits across ledger_entries; must stay 0")
                .register(registry);
    }

    @Scheduled(fixedRate = 15000)
    public void refresh() {
        BigDecimal debits = repository.sumDebits();
        BigDecimal credits = repository.sumCredits();
        imbalance.set(debits.subtract(credits).doubleValue());
    }
}
