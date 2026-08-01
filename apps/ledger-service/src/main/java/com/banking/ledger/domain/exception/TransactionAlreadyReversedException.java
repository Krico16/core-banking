package com.banking.ledger.domain.exception;

public class TransactionAlreadyReversedException extends DomainException {
    public TransactionAlreadyReversedException(String entryId) {
        super("Transaction already reversed: " + entryId);
    }
}
