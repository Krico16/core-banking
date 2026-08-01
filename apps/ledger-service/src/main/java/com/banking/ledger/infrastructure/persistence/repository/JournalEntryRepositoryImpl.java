package com.banking.ledger.infrastructure.persistence.repository;

import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.port.JournalEntryRepository;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.infrastructure.persistence.entity.JournalEntryJpaEntity;
import com.banking.ledger.infrastructure.persistence.mapper.JournalEntryMapper;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public class JournalEntryRepositoryImpl implements JournalEntryRepository {

    private final JournalEntryJpaRepository jpaRepository;
    private final EntityManager entityManager;
    private final JournalEntryMapper mapper;

    public JournalEntryRepositoryImpl(
            JournalEntryJpaRepository jpaRepository,
            EntityManager entityManager,
            JournalEntryMapper mapper
    ) {
        this.jpaRepository = jpaRepository;
        this.entityManager = entityManager;
        this.mapper = mapper;
    }

    @Override
    public Optional<JournalEntry> findById(JournalEntryId id) {
        return jpaRepository.findById(id.toString()).map(mapper::toDomain);
    }

    @Override
    public Optional<JournalEntry> findByIdempotencyKey(IdempotencyKey key) {
        return jpaRepository.findByIdempotencyKey(key.toString()).map(mapper::toDomain);
    }

    @Override
    public JournalEntry save(JournalEntry entry) {
        JournalEntryJpaEntity existing = entityManager.find(JournalEntryJpaEntity.class, entry.getId().toString());
        if (existing != null) {
            existing.setStatus(entry.getStatus().name());
            existing.setReversedAt(entry.getReversedAt());
            existing.setReversedByEntryId(entry.getReversedByEntryId());
            return mapper.toDomain(existing);
        }
        JournalEntryJpaEntity entity = mapper.toJpa(entry);
        jpaRepository.save(entity);
        return mapper.toDomain(entity);
    }
}
