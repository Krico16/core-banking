package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.CurrencyMismatchException;
import com.banking.ledger.domain.exception.InvalidMoneyException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public record Money(BigDecimal amount, String currency) {

    public Money {
        Objects.requireNonNull(amount, "Amount cannot be null");
        Objects.requireNonNull(currency, "Currency cannot be null");
        Currency validated = Currency.of(currency);
        currency = validated.code();
        amount = amount.setScale(4, RoundingMode.HALF_UP);
    }

    public static Money of(BigDecimal amount, String currency) {
        return new Money(amount, currency);
    }

    public static Money of(BigDecimal amount, Currency currency) {
        return new Money(amount, currency.code());
    }

    public static Money ofPositive(BigDecimal amount, String currency) {
        Money money = of(amount, currency);
        if (!money.isPositive()) {
            throw new InvalidMoneyException("Amount must be positive: " + amount);
        }
        return money;
    }

    public static Money ofPositive(BigDecimal amount, Currency currency) {
        return ofPositive(amount, currency.code());
    }

    public static Money ofCents(long cents, String currency) {
        return new Money(
                BigDecimal.valueOf(cents).divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP),
                currency
        );
    }

    /** Inverse of {@link #ofCents}: the amount expressed as an integer in the minor
     * currency unit (cents), for serializing on the wire per the event contracts. */
    public long toCents() {
        return this.amount.movePointRight(2).setScale(0, RoundingMode.HALF_UP).longValueExact();
    }

    public static Money zero(String currency) {
        return new Money(BigDecimal.ZERO, currency);
    }

    public Currency currencyValue() {
        return Currency.of(currency);
    }

    public Money add(Money other) {
        assertSameCurrency(other);
        return new Money(this.amount.add(other.amount), this.currency);
    }

    public Money subtract(Money other) {
        assertSameCurrency(other);
        return new Money(this.amount.subtract(other.amount), this.currency);
    }

    public boolean isPositive() {
        return this.amount.compareTo(BigDecimal.ZERO) > 0;
    }

    public boolean isZero() {
        return this.amount.compareTo(BigDecimal.ZERO) == 0;
    }

    public boolean isNegative() {
        return this.amount.compareTo(BigDecimal.ZERO) < 0;
    }

    public boolean greaterThan(Money other) {
        assertSameCurrency(other);
        return this.amount.compareTo(other.amount) > 0;
    }

    public boolean greaterThanOrEqual(Money other) {
        assertSameCurrency(other);
        return this.amount.compareTo(other.amount) >= 0;
    }

    private void assertSameCurrency(Money other) {
        if (!this.currency.equals(other.currency)) {
            throw new CurrencyMismatchException(this.currency, other.currency);
        }
    }
}
