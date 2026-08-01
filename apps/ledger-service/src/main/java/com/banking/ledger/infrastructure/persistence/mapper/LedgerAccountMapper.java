package com.banking.ledger.infrastructure.persistence.mapper;

import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.LedgerAccountType;
import com.banking.ledger.domain.vo.Money;
import com.banking.ledger.infrastructure.persistence.entity.LedgerAccountJpaEntity;
import org.springframework.stereotype.Component;

@Component
public class LedgerAccountMapper {

    public LedgerAccount toDomain(LedgerAccountJpaEntity entity) {
        return LedgerAccount.reconstruct(
                LedgerAccountId.of(entity.getId()),
                entity.getAccountId(),
                entity.getAccountNumber(),
                LedgerAccountType.valueOf(entity.getAccountType()),
                entity.getCurrency(),
                Money.of(entity.getBalanceAmount(), entity.getCurrency()),
                Money.of(entity.getAvailableBalanceAmount(), entity.getCurrency()),
                entity.getVersion()
        );
    }

    public LedgerAccountJpaEntity toJpa(LedgerAccount domain) {
        LedgerAccountJpaEntity entity = new LedgerAccountJpaEntity();
        entity.setId(domain.getId().toString());
        entity.setAccountId(domain.getAccountId());
        entity.setAccountNumber(domain.getAccountNumber());
        entity.setAccountType(domain.getType().name());
        entity.setCurrency(domain.getCurrency());
        entity.setBalanceAmount(domain.getBalance().amount());
        entity.setAvailableBalanceAmount(domain.getAvailableBalance().amount());
        entity.setVersion(domain.getVersion());
        return entity;
    }
}
