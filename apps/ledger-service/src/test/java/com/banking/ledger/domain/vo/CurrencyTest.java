package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.UnsupportedCurrencyException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CurrencyTest {

    @Test
    void acceptsSupportedCurrencies() {
        assertEquals("EUR", Currency.of("eur").code());
        assertEquals("USD", Currency.of("USD").code());
        assertEquals("MXN", Currency.of("mxn").code());
        assertEquals("COP", Currency.of("COP").code());
    }

    @Test
    void rejectsUnsupported() {
        assertThrows(UnsupportedCurrencyException.class, () -> Currency.of("XYZ"));
        assertThrows(UnsupportedCurrencyException.class, () -> Currency.of("US"));
        assertThrows(UnsupportedCurrencyException.class, () -> Currency.of(""));
    }

    @Test
    void bankCashIdsArePerCurrency() {
        assertEquals("BANK_CASH_USD", Currency.of("USD").bankCashAccountId());
        assertEquals("BANK_CASH_EUR", Currency.of("EUR").bankCashAccountId());
        assertNotEquals(
                Currency.of("USD").bankCashAccountId(),
                Currency.of("EUR").bankCashAccountId()
        );
    }
}
