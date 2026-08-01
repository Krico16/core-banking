package com.banking.ledger.domain.exception;

public class UnsupportedCurrencyException extends DomainException {
    public UnsupportedCurrencyException(String message) {
        super(message);
    }
}
