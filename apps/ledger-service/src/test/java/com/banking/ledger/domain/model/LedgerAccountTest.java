package com.banking.ledger.domain.model;

import com.banking.ledger.domain.exception.InsufficientFundsException;
import com.banking.ledger.domain.vo.LedgerAccountType;
import com.banking.ledger.domain.vo.Money;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class LedgerAccountTest {

    @Test
    void assetDebitIncreasesBalance() {
        LedgerAccount cash = LedgerAccount.create("BANK", "CASH", LedgerAccountType.ASSET, "EUR");
        cash.debit(Money.ofPositive(new BigDecimal("100"), "EUR"));
        assertEquals(new BigDecimal("100.0000"), cash.getBalance().amount());
    }

    @Test
    void liabilityCreditIncreasesBalance() {
        LedgerAccount customer = LedgerAccount.create("ACC1", "EU1", LedgerAccountType.LIABILITY, "EUR");
        customer.credit(Money.ofPositive(new BigDecimal("100"), "EUR"));
        assertEquals(new BigDecimal("100.0000"), customer.getBalance().amount());
    }

    @Test
    void liabilityDebitRequiresFunds() {
        LedgerAccount customer = LedgerAccount.create("ACC1", "EU1", LedgerAccountType.LIABILITY, "EUR");
        assertThrows(InsufficientFundsException.class,
                () -> customer.debit(Money.ofPositive(new BigDecimal("1"), "EUR")));
    }

    @Test
    void depositFlowKeepsDoubleEntryBalances() {
        LedgerAccount bank = LedgerAccount.create("BANK", "CASH", LedgerAccountType.ASSET, "EUR");
        LedgerAccount customer = LedgerAccount.create("ACC1", "EU1", LedgerAccountType.LIABILITY, "EUR");
        Money amount = Money.ofPositive(new BigDecimal("250"), "EUR");

        bank.debit(amount);
        customer.credit(amount);

        assertEquals(bank.getBalance().amount(), customer.getBalance().amount());
    }
}
