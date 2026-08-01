package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.UnsupportedCurrencyException;

import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

/**
 * ISO 4217 currencies supported by the ledger.
 * FX conversion is intentionally out of scope — each account is single-currency.
 */
public record Currency(String code) {

    private static final Set<String> SUPPORTED = Collections.unmodifiableSet(new LinkedHashSet<>(Arrays.asList(
            "EUR", "USD", "GBP", "CHF", "JPY",
            "MXN", "COP", "ARS", "CLP", "BRL", "PEN"
    )));

    public Currency {
        if (code == null || code.isBlank()) {
            throw new UnsupportedCurrencyException("Currency code cannot be empty");
        }
        code = code.trim().toUpperCase(Locale.ROOT);
        if (code.length() != 3 || !code.chars().allMatch(Character::isLetter)) {
            throw new UnsupportedCurrencyException("Currency must be a 3-letter ISO 4217 code: " + code);
        }
        if (!SUPPORTED.contains(code)) {
            throw new UnsupportedCurrencyException(
                    "Unsupported currency: " + code + ". Supported: " + String.join(", ", SUPPORTED)
            );
        }
    }

    public static Currency of(String code) {
        return new Currency(code);
    }

    public static boolean isSupported(String code) {
        if (code == null || code.isBlank()) {
            return false;
        }
        return SUPPORTED.contains(code.trim().toUpperCase(Locale.ROOT));
    }

    public static Set<String> supportedCodes() {
        return SUPPORTED;
    }

    public String bankCashAccountId() {
        return "BANK_CASH_" + code;
    }

    public String bankCashAccountNumber() {
        return "BANK_CASH_" + code;
    }

    @Override
    public String toString() {
        return code;
    }
}
