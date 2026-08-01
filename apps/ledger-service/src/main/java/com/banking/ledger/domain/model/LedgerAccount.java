package com.banking.ledger.domain.model;

import com.banking.ledger.domain.exception.CurrencyMismatchException;
import com.banking.ledger.domain.exception.InsufficientFundsException;
import com.banking.ledger.domain.vo.Currency;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.LedgerAccountType;
import com.banking.ledger.domain.vo.Money;

public class LedgerAccount {

    private final LedgerAccountId id;
    private final String accountId;          // referencia a account-service
    private final String accountNumber;
    private final LedgerAccountType type;
    private final String currency;
    private Money balance;
    private Money availableBalance;
    private long version;

    private LedgerAccount(
            LedgerAccountId id,
            String accountId,
            String accountNumber,
            LedgerAccountType type,
            String currency,
            Money balance,
            Money availableBalance,
            long version
    ) {
        this.id = id;
        this.accountId = accountId;
        this.accountNumber = accountNumber;
        this.type = type;
        this.currency = currency;
        this.balance = balance;
        this.availableBalance = availableBalance;
        this.version = version;
    }

    public static LedgerAccount create(
            String accountId,
            String accountNumber,
            LedgerAccountType type,
            String currency
    ) {
        Currency ccy = Currency.of(currency);
        return new LedgerAccount(
                LedgerAccountId.generate(),
                accountId,
                accountNumber,
                type,
                ccy.code(),
                Money.zero(ccy.code()),
                Money.zero(ccy.code()),
                0
        );
    }

    public void assertSameCurrency(String operationCurrency) {
        Currency expected = Currency.of(this.currency);
        Currency actual = Currency.of(operationCurrency);
        if (!expected.code().equals(actual.code())) {
            throw new CurrencyMismatchException(expected.code(), actual.code());
        }
    }

    public static LedgerAccount reconstruct(
            LedgerAccountId id,
            String accountId,
            String accountNumber,
            LedgerAccountType type,
            String currency,
            Money balance,
            Money availableBalance,
            long version
    ) {
        return new LedgerAccount(id, accountId, accountNumber, type, currency, balance, availableBalance, version);
    }

    public void credit(Money amount) {
        assertCurrency(amount);
        if (type == LedgerAccountType.ASSET) {
            if (this.availableBalance.amount().compareTo(amount.amount()) < 0) {
                throw new InsufficientFundsException(this.accountId);
            }
            this.balance = this.balance.subtract(amount);
            this.availableBalance = this.availableBalance.subtract(amount);
        } else {
            this.balance = this.balance.add(amount);
            this.availableBalance = this.availableBalance.add(amount);
        }
    }

    public void debit(Money amount) {
        assertCurrency(amount);
        if (type == LedgerAccountType.ASSET) {
            this.balance = this.balance.add(amount);
            this.availableBalance = this.availableBalance.add(amount);
        } else {
            if (this.availableBalance.amount().compareTo(amount.amount()) < 0) {
                throw new InsufficientFundsException(this.accountId);
            }
            this.balance = this.balance.subtract(amount);
            this.availableBalance = this.availableBalance.subtract(amount);
        }
    }

    public void hold(Money amount) {
        assertCurrency(amount);
        if (this.availableBalance.amount().compareTo(amount.amount()) < 0) {
            throw new InsufficientFundsException(this.accountId);
        }
        this.availableBalance = this.availableBalance.subtract(amount);
    }

    public void release(Money amount) {
        assertCurrency(amount);
        this.availableBalance = this.availableBalance.add(amount);
    }

    private void assertCurrency(Money amount) {
        if (!this.currency.equals(amount.currency())) {
            throw new CurrencyMismatchException(this.currency, amount.currency());
        }
    }

    // Getters
    public LedgerAccountId getId() { return id; }
    public String getAccountId() { return accountId; }
    public String getAccountNumber() { return accountNumber; }
    public LedgerAccountType getType() { return type; }
    public String getCurrency() { return currency; }
    public Money getBalance() { return balance; }
    public Money getAvailableBalance() { return availableBalance; }
    public long getVersion() { return version; }
}
