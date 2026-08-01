package com.banking.ledger.domain.exception;

public class JournalEntryNotFoundException extends DomainException {
    public JournalEntryNotFoundException(String entryId) {
        super("Journal entry not found: " + entryId);
    }
}
