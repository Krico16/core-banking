package com.banking.ledger.domain.port;

import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;

import java.util.Optional;

public interface JournalEntryRepository {

    Optional<JournalEntry> findById(JournalEntryId id);

    Optional<JournalEntry> findByIdempotencyKey(IdempotencyKey key);

    JournalEntry save(JournalEntry entry);
}
