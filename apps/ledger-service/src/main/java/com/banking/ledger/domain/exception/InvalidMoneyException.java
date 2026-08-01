package com.banking.ledger.domain.exception;

public class InvalidMoneyException extends DomainException {
    public InvalidMoneyException(String message) {
        super(message);
    }
}
