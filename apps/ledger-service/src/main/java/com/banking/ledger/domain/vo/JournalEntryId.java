package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.InvalidIdentifierException;

public record JournalEntryId(String value) {

    public JournalEntryId {
        if (value == null || value.isBlank() || value.length() < 10) {
            throw new InvalidIdentifierException("Invalid journal entry ID: " + value);
        }
    }

    public static JournalEntryId generate() {
        return new JournalEntryId(com.github.f4b6a3.ulid.UlidCreator.getUlid().toString());
    }

    public static JournalEntryId of(String value) {
        return new JournalEntryId(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
