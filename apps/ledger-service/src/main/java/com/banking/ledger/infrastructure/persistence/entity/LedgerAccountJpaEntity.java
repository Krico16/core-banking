package com.banking.ledger.infrastructure.persistence.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "ledger_accounts")
public class LedgerAccountJpaEntity {

    @Id
    private String id;

    @Column(name = "account_id", nullable = false, unique = true)
    private String accountId;

    @Column(name = "account_number", nullable = false)
    private String accountNumber;

    @Column(name = "account_type", nullable = false)
    private String accountType;

    @Column(nullable = false, length = 3)
    private String currency;

    @Column(name = "balance_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal balanceAmount;

    @Column(name = "available_balance_amount", nullable = false, precision = 19, scale = 4)
    private BigDecimal availableBalanceAmount;

    @Version
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = Instant.now();
    }

    // Getters and setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getAccountId() { return accountId; }
    public void setAccountId(String accountId) { this.accountId = accountId; }
    public String getAccountNumber() { return accountNumber; }
    public void setAccountNumber(String accountNumber) { this.accountNumber = accountNumber; }
    public String getAccountType() { return accountType; }
    public void setAccountType(String accountType) { this.accountType = accountType; }
    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }
    public BigDecimal getBalanceAmount() { return balanceAmount; }
    public void setBalanceAmount(BigDecimal balanceAmount) { this.balanceAmount = balanceAmount; }
    public BigDecimal getAvailableBalanceAmount() { return availableBalanceAmount; }
    public void setAvailableBalanceAmount(BigDecimal availableBalanceAmount) { this.availableBalanceAmount = availableBalanceAmount; }
    public long getVersion() { return version; }
    public void setVersion(long version) { this.version = version; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
