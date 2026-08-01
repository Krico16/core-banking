package com.banking.ledger.domain.exception;

public class CurrencyMismatchException extends DomainException {
    public CurrencyMismatchException(String expected, String actual) {
        super("Currency mismatch: expected " + expected + " but got " + actual);
    }

    public CurrencyMismatchException(String message) {
        super(message);
    }
}
