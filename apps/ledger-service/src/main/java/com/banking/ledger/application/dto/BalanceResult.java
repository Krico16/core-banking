package com.banking.ledger.application.dto;

import java.math.BigDecimal;

public record BalanceResult(
        String accountId,
        String accountNumber,
        BigDecimal balance,
        BigDecimal availableBalance,
        String currency,
        long version
) {}
