package com.banking.ledger.application.usecase;

import com.banking.ledger.application.dto.CreateLedgerAccountCommand;
import com.banking.ledger.domain.exception.InvalidTransferException;
import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.vo.Currency;
import com.banking.ledger.domain.vo.LedgerAccountType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreateLedgerAccountUseCase {

    private final LedgerAccountRepository accountRepository;

    public CreateLedgerAccountUseCase(LedgerAccountRepository accountRepository) {
        this.accountRepository = accountRepository;
    }

    @Transactional
    public LedgerAccount execute(CreateLedgerAccountCommand command) {
        return accountRepository.findByAccountId(command.accountId())
                .orElseGet(() -> {
                    Currency currency = Currency.of(command.currency());

                    LedgerAccountType type;
                    try {
                        type = LedgerAccountType.valueOf(command.accountType().toUpperCase());
                    } catch (IllegalArgumentException | NullPointerException e) {
                        throw new InvalidTransferException(
                                "Invalid account type: " + command.accountType() + " (expected ASSET or LIABILITY)"
                        );
                    }

                    LedgerAccount account = LedgerAccount.create(
                            command.accountId(),
                            command.accountNumber(),
                            type,
                            currency.code()
                    );
                    return accountRepository.save(account);
                });
    }
}
