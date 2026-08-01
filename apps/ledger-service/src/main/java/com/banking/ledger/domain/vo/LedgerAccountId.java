package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.InvalidIdentifierException;

public record LedgerAccountId(String value) {

    public LedgerAccountId {
        if (value == null || value.isBlank() || value.length() < 10) {
            throw new InvalidIdentifierException("Invalid ledger account ID: " + value);
        }
    }

    public static LedgerAccountId generate() {
        return new LedgerAccountId(com.github.f4b6a3.ulid.UlidCreator.getUlid().toString());
    }

    public static LedgerAccountId of(String value) {
        return new LedgerAccountId(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
