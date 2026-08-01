package com.banking.ledger.domain.port;

import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.vo.LedgerAccountId;

import java.util.Optional;

public interface LedgerAccountRepository {

    Optional<LedgerAccount> findById(LedgerAccountId id);

    Optional<LedgerAccount> findByAccountId(String accountId);

    LedgerAccount save(LedgerAccount account);
}
