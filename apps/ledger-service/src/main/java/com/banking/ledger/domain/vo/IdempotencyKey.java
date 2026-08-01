package com.banking.ledger.domain.vo;

import com.banking.ledger.domain.exception.InvalidIdempotencyKeyException;

public record IdempotencyKey(String value) {

    public IdempotencyKey {
        if (value == null || value.isBlank()) {
            throw new InvalidIdempotencyKeyException("Idempotency key cannot be empty");
        }
        if (value.length() > 255) {
            throw new InvalidIdempotencyKeyException("Idempotency key too long");
        }
    }

    public static IdempotencyKey of(String value) {
        return new IdempotencyKey(value);
    }

    @Override
    public String toString() {
        return value;
    }
}
