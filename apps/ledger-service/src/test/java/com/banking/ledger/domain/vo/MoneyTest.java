package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.InvalidMoneyException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class MoneyTest {

    @Test
    void ofPositive_rejectsZeroAndNegative() {
        assertThrows(InvalidMoneyException.class, () -> Money.ofPositive(BigDecimal.ZERO, "EUR"));
        assertThrows(InvalidMoneyException.class, () -> Money.ofPositive(new BigDecimal("-1"), "EUR"));
    }

    @Test
    void ofPositive_acceptsPositive() {
        Money money = Money.ofPositive(new BigDecimal("10.50"), "eur");
        assertEquals(new BigDecimal("10.5000"), money.amount());
        assertEquals("EUR", money.currency());
    }

    @Test
    void add_rejectsCurrencyMismatch() {
        Money eur = Money.of(new BigDecimal("10"), "EUR");
        Money usd = Money.of(new BigDecimal("10"), "USD");
        assertThrows(InvalidMoneyException.class, () -> eur.add(usd));
    }

    @Test
    void neverUsesFloatingPoint() {
        Money a = Money.ofCents(10, "EUR");
        Money b = Money.ofCents(20, "EUR");
        assertEquals(Money.of(new BigDecimal("0.3000"), "EUR"), a.add(b));
    }

    @Test
    void toCents_roundTripsWithOfCents() {
        assertEquals(1050L, Money.ofCents(1050, "EUR").toCents());
        assertEquals(0L, Money.zero("USD").toCents());
        assertEquals(100000L, Money.of(new BigDecimal("1000.00"), "EUR").toCents());
    }
}
