package com.banking.ledger.application.dto;

import jakarta.validation.constraints.NotBlank;

public record ReverseCommand(
        @NotBlank String originalEntryId,
        @NotBlank String idempotencyKey,
        String reason
) {}
