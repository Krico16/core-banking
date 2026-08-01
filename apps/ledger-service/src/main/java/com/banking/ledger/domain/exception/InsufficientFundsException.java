package com.banking.ledger.domain.exception;

public class InsufficientFundsException extends DomainException {
    public InsufficientFundsException(String accountId) {
        super("Insufficient funds for account: " + accountId);
    }
}
