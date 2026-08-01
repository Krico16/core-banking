package com.banking.ledger.domain.service;

import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.vo.Currency;
import com.banking.ledger.domain.vo.LedgerAccountType;

/**
 * Resolves the bank cash (ASSET) counterpart account for a given currency.
 * One BANK_CASH_{CCY} account per supported currency — required for multi-currency double-entry.
 */
public class BankCashAccountResolver {

    private final LedgerAccountRepository accountRepository;

    public BankCashAccountResolver(LedgerAccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    public LedgerAccount resolve(Currency currency) {
        String accountId = currency.bankCashAccountId();
        return accountRepository.findByAccountId(accountId)
                .orElseGet(() -> accountRepository.save(
                        LedgerAccount.create(
                                accountId,
                                currency.bankCashAccountNumber(),
                                LedgerAccountType.ASSET,
                                currency.code()
                        )
                ));
    }
}
