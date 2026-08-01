package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.infrastructure.persistence.entity.LedgerAccountJpaEntity;
import com.banking.ledger.infrastructure.persistence.mapper.LedgerAccountMapper;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class LedgerAccountRepositoryImpl implements LedgerAccountRepository {

    private final LedgerAccountJpaRepository jpaRepository;
    private final EntityManager entityManager;
    private final LedgerAccountMapper mapper;

    public LedgerAccountRepositoryImpl(
            LedgerAccountJpaRepository jpaRepository,
            EntityManager entityManager,
            LedgerAccountMapper mapper
    ) {
        this.jpaRepository = jpaRepository;
        this.entityManager = entityManager;
        this.mapper = mapper;
    }

    @Override
    public Optional<LedgerAccount> findById(LedgerAccountId id) {
        return jpaRepository.findById(id.toString()).map(mapper::toDomain);
    }

    @Override
    public Optional<LedgerAccount> findByAccountId(String accountId) {
        return jpaRepository.findByAccountId(accountId).map(mapper::toDomain);
    }

    @Override
    public LedgerAccount save(LedgerAccount account) {
        LedgerAccountJpaEntity existing = entityManager.find(LedgerAccountJpaEntity.class, account.getId().toString());
        if (existing != null) {
            existing.setBalanceAmount(account.getBalance().amount());
            existing.setAvailableBalanceAmount(account.getAvailableBalance().amount());
            return mapper.toDomain(existing);
        }
        LedgerAccountJpaEntity entity = mapper.toJpa(account);
        jpaRepository.save(entity);
        return mapper.toDomain(entity);
    }
}
