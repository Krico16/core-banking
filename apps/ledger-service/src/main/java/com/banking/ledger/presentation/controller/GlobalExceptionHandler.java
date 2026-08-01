package com.banking.ledger.presentation.controller;

import com.banking.ledger.domain.exception.AccountNotFoundException;
import com.banking.ledger.domain.exception.CurrencyMismatchException;
import com.banking.ledger.domain.exception.DomainException;
import com.banking.ledger.domain.exception.DuplicateTransactionException;
import com.banking.ledger.domain.exception.InsufficientFundsException;
import com.banking.ledger.domain.exception.InvalidIdempotencyKeyException;
import com.banking.ledger.domain.exception.InvalidIdentifierException;
import com.banking.ledger.domain.exception.InvalidMoneyException;
import com.banking.ledger.domain.exception.InvalidTransferException;
import com.banking.ledger.domain.exception.JournalEntryNotFoundException;
import com.banking.ledger.domain.exception.TransactionAlreadyReversedException;
import com.banking.ledger.domain.exception.UnbalancedEntryException;
import com.banking.ledger.domain.exception.UnsupportedCurrencyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(AccountNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "ACCOUNT_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(JournalEntryNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleJournalNotFound(JournalEntryNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, "JOURNAL_ENTRY_NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler({
            InsufficientFundsException.class,
            TransactionAlreadyReversedException.class,
            DuplicateTransactionException.class,
            UnbalancedEntryException.class
    })
    public ResponseEntity<Map<String, Object>> handleConflict(DomainException ex) {
        return error(HttpStatus.CONFLICT, ex.getClass().getSimpleName(), ex.getMessage());
    }

    @ExceptionHandler({
            InvalidMoneyException.class,
            InvalidIdempotencyKeyException.class,
            InvalidIdentifierException.class,
            InvalidTransferException.class,
            CurrencyMismatchException.class,
            UnsupportedCurrencyException.class
    })
    public ResponseEntity<Map<String, Object>> handleBadRequest(DomainException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getClass().getSimpleName(), ex.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(err -> err.getField() + ": " + err.getDefaultMessage())
                .collect(Collectors.joining("; "));
        return error(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", details);
    }

    @ExceptionHandler(MissingRequestHeaderException.class)
    public ResponseEntity<Map<String, Object>> handleMissingHeader(MissingRequestHeaderException ex) {
        return error(HttpStatus.BAD_REQUEST, "MISSING_HEADER", ex.getMessage());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    public ResponseEntity<Map<String, Object>> handleOptimisticLock(ObjectOptimisticLockingFailureException ex) {
        return error(HttpStatus.CONFLICT, "OPTIMISTIC_LOCK", "Concurrent update detected, please retry");
    }

    @ExceptionHandler(DomainException.class)
    public ResponseEntity<Map<String, Object>> handleDomain(DomainException ex) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, "DOMAIN_ERROR", ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Unexpected error");
    }

    private ResponseEntity<Map<String, Object>> error(HttpStatus status, String code, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("code", code);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
