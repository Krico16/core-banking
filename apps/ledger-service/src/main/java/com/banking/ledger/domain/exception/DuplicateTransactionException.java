package com.banking.ledger.domain.exception;

public class DuplicateTransactionException extends DomainException {
    public DuplicateTransactionException(String idempotencyKey) {
        super("Transaction already processed with idempotency key: " + idempotencyKey);
    }
}
