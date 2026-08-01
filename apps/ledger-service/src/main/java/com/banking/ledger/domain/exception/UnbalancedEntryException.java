package com.banking.ledger.domain.exception;

public class UnbalancedEntryException extends DomainException {
    public UnbalancedEntryException(String message) {
        super(message);
    }
}
