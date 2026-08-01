package com.banking.ledger.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ledger_entries")
public class LedgerEntryJpaEntity {

    @Id
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "journal_entry_id", nullable = false)
    private JournalEntryJpaEntity journalEntry;

    @Column(name = "ledger_account_id", nullable = false)
    private String ledgerAccountId;

    @Column(name = "account_id", nullable = false)
    private String accountId;

    @Column(name = "entry_type", nullable = false)
    private String entryType;

    @Column(nullable = false, precision = 19, scale = 4)
    private BigDecimal amount;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public JournalEntryJpaEntity getJournalEntry() { return journalEntry; }
    public void setJournalEntry(JournalEntryJpaEntity journalEntry) { this.journalEntry = journalEntry; }
    public String getLedgerAccountId() { return ledgerAccountId; }
    public void setLedgerAccountId(String ledgerAccountId) { this.ledgerAccountId = ledgerAccountId; }
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
