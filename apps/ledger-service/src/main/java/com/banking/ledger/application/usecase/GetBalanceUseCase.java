package com.banking.ledger.application.usecase;

import com.banking.ledger.application.dto.BalanceResult;
import com.banking.ledger.domain.exception.AccountNotFoundException;
import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GetBalanceUseCase {

    private final LedgerAccountRepository accountRepository;

    public GetBalanceUseCase(LedgerAccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional(readOnly = true)
    public BalanceResult byAccountId(String accountId) {
        LedgerAccount account = accountRepository.findByAccountId(accountId)
                .orElseThrow(() -> new AccountNotFoundException(accountId));
        return toResult(account);
    }

    @Transactional(readOnly = true)
    public BalanceResult byId(String id) {
        LedgerAccount account = accountRepository.findById(
                com.banking.ledger.domain.vo.LedgerAccountId.of(id))
                .orElseThrow(() -> new AccountNotFoundException(id));
        return toResult(account);
    }

    private BalanceResult toResult(LedgerAccount account) {
        return new BalanceResult(
                account.getAccountId(),
                account.getAccountNumber(),
                account.getBalance().amount(),
                account.getAvailableBalance().amount(),
                account.getCurrency(),
                account.getVersion()
        );
    }
}
