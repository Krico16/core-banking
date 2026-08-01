package com.banking.ledger.domain.service;

import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.vo.Currency;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.LedgerAccountType;
import com.banking.ledger.domain.vo.Money;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

class BankCashAccountResolverTest {

    @Test
    void createsBankCashWhenMissing() {
        InMemoryRepo repo = new InMemoryRepo();
        BankCashAccountResolver resolver = new BankCashAccountResolver(repo);

        LedgerAccount usd = resolver.resolve(Currency.of("USD"));

        assertEquals("BANK_CASH_USD", usd.getAccountId());
        assertEquals(LedgerAccountType.ASSET, usd.getType());
        assertEquals("USD", usd.getCurrency());
        assertTrue(repo.findByAccountId("BANK_CASH_USD").isPresent());
    }

    @Test
    void returnsExistingBankCash() {
        InMemoryRepo repo = new InMemoryRepo();
        LedgerAccount existing = LedgerAccount.reconstruct(
                LedgerAccountId.generate(),
                "BANK_CASH_EUR",
                "BANK_CASH_EUR",
                LedgerAccountType.ASSET,
                "EUR",
                Money.of(new BigDecimal("500"), "EUR"),
                Money.of(new BigDecimal("500"), "EUR"),
                1
        );
        repo.save(existing);

        BankCashAccountResolver resolver = new BankCashAccountResolver(repo);
        LedgerAccount resolved = resolver.resolve(Currency.of("EUR"));

        assertEquals(existing.getId().toString(), resolved.getId().toString());
        assertEquals(new BigDecimal("500.0000"), resolved.getBalance().amount());
    }

    static class InMemoryRepo implements LedgerAccountRepository {
        private final Map<String, LedgerAccount> byAccountId = new HashMap<>();
        private final Map<String, LedgerAccount> byId = new HashMap<>();

        @Override
        public Optional<LedgerAccount> findById(LedgerAccountId id) {
            return Optional.ofNullable(byId.get(id.toString()));
        }

        @Override
        public Optional<LedgerAccount> findByAccountId(String accountId) {
            return Optional.ofNullable(byAccountId.get(accountId));
        }

        @Override
        public LedgerAccount save(LedgerAccount account) {
            byAccountId.put(account.getAccountId(), account);
            byId.put(account.getId().toString(), account);
            return account;
        }
    }
}
