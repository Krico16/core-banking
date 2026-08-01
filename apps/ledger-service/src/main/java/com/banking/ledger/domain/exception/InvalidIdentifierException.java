package com.banking.ledger.domain.exception;

public class InvalidIdentifierException extends DomainException {
    public InvalidIdentifierException(String message) {
        super(message);
    }
}
