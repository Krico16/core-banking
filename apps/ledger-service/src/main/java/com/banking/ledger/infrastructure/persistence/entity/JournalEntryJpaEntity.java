package com.banking.ledger.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "journal_entries")
public class JournalEntryJpaEntity {

    @Id
    private String id;

    @Column(name = "transaction_id", nullable = false)
    private String transactionId;

    @Column(name = "entry_type", nullable = false)
    private String entryType;

    @Column(nullable = false)
    private String status;

    @Column(name = "idempotency_key", nullable = false, unique = true)
    private String idempotencyKey;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "reversed_at")
    private Instant reversedAt;

    @Column(name = "reversed_by_entry_id")
    private String reversedByEntryId;

    @OneToMany(mappedBy = "journalEntry", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<LedgerEntryJpaEntity> entries;

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }
    public String getEntryType() { return entryType; }
    public void setEntryType(String entryType) { this.entryType = entryType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getIdempotencyKey() { return idempotencyKey; }
    public void setIdempotencyKey(String idempotencyKey) { this.idempotencyKey = idempotencyKey; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getReversedAt() { return reversedAt; }
    public void setReversedAt(Instant reversedAt) { this.reversedAt = reversedAt; }
    public String getReversedByEntryId() { return reversedByEntryId; }
    public void setReversedByEntryId(String reversedByEntryId) { this.reversedByEntryId = reversedByEntryId; }
    public List<LedgerEntryJpaEntity> getEntries() { return entries; }
    public void setEntries(List<LedgerEntryJpaEntity> entries) { this.entries = entries; }
}
