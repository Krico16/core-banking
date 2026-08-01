package com.banking.ledger.domain.exception;

public class AccountNotFoundException extends DomainException {
    public AccountNotFoundException(String accountId) {
        super("Ledger account not found: " + accountId);
    }
}
