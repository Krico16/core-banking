package com.banking.ledger.infrastructure.config;

import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.service.BankCashAccountResolver;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DomainConfig {

    @Bean
    public BankCashAccountResolver bankCashAccountResolver(LedgerAccountRepository accountRepository) {
        return new BankCashAccountResolver(accountRepository);
    }
}
