package com.banking.ledger.application.dto;

import jakarta.validation.constraints.NotBlank;

public record CreateLedgerAccountCommand(
        @NotBlank String accountId,
        @NotBlank String accountNumber,
        @NotBlank String accountType,
        @NotBlank String currency
) {}
