package com.banking.ledger.application.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

public record WithdrawCommand(
        @NotBlank String accountId,
        @NotNull @Positive BigDecimal amount,
        @NotBlank String currency,
        @NotBlank String idempotencyKey,
        String description
) {}
