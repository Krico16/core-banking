package com.banking.ledger.infrastructure.persistence.mapper;

import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.model.LedgerEntry;
import com.banking.ledger.domain.vo.DebitCredit;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.domain.vo.JournalEntryStatus;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.Money;
import com.banking.ledger.infrastructure.persistence.entity.JournalEntryJpaEntity;
import com.banking.ledger.infrastructure.persistence.entity.LedgerEntryJpaEntity;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class JournalEntryMapper {

    public JournalEntry toDomain(JournalEntryJpaEntity entity) {
        List<LedgerEntry> entries = entity.getEntries().stream()
                .map(this::toDomainEntry)
                .toList();

        return JournalEntry.reconstruct(
                JournalEntryId.of(entity.getId()),
                entity.getTransactionId(),
                EntryType.valueOf(entity.getEntryType()),
                JournalEntryStatus.valueOf(entity.getStatus()),
                IdempotencyKey.of(entity.getIdempotencyKey()),
                entity.getDescription(),
                entity.getCreatedAt(),
                entity.getReversedAt(),
                entity.getReversedByEntryId(),
                entries
        );
    }

    public JournalEntryJpaEntity toJpa(JournalEntry domain) {
        JournalEntryJpaEntity entity = new JournalEntryJpaEntity();
        entity.setId(domain.getId().toString());
        entity.setTransactionId(domain.getTransactionId());
        entity.setEntryType(domain.getEntryType().name());
        entity.setStatus(domain.getStatus().name());
        entity.setIdempotencyKey(domain.getIdempotencyKey().toString());
        entity.setDescription(domain.getDescription());
        entity.setCreatedAt(domain.getCreatedAt());
        entity.setReversedAt(domain.getReversedAt());
        entity.setReversedByEntryId(domain.getReversedByEntryId());

        List<LedgerEntryJpaEntity> jpaEntries = domain.getEntries().stream()
                .map(e -> toJpaEntry(e, entity))
                .toList();
        entity.setEntries(jpaEntries);

        return entity;
    }

    private LedgerEntry toDomainEntry(LedgerEntryJpaEntity entity) {
        return LedgerEntry.reconstruct(
                entity.getId(),
                entity.getJournalEntry().getId(),
                LedgerAccountId.of(entity.getLedgerAccountId()),
                entity.getAccountId(),
                DebitCredit.valueOf(entity.getEntryType()),
                Money.of(entity.getAmount(), entity.getCurrency())
        );
    }

    private LedgerEntryJpaEntity toJpaEntry(LedgerEntry domain, JournalEntryJpaEntity journalEntry) {
        LedgerEntryJpaEntity entity = new LedgerEntryJpaEntity();
        entity.setId(domain.getId());
        entity.setJournalEntry(journalEntry);
        entity.setLedgerAccountId(domain.getLedgerAccountId().toString());
        entity.setAccountId(domain.getAccountId());
        entity.setEntryType(domain.getType().name());
        entity.setAmount(domain.getAmount().amount());
        entity.setCurrency(domain.getAmount().currency());
        return entity;
    }
}
