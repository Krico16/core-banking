package com.banking.ledger.domain.exception;

public class InvalidTransferException extends DomainException {
    public InvalidTransferException(String message) {
        super(message);
    }
}
