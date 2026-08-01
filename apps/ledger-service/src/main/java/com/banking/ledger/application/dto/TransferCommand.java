package com.banking.ledger.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record TransferCommand(
        @NotBlank String sourceAccountId,
        @NotBlank String targetAccountId,
        @NotNull @Positive BigDecimal amount,
        @NotBlank String currency,
        @NotBlank String idempotencyKey,
        String description,
        String paymentId
) {}
