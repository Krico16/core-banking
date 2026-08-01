package com.banking.ledger.application.usecase;

import com.banking.ledger.application.dto.ReverseCommand;
import com.banking.ledger.application.dto.TransactionResult;
import com.banking.ledger.application.service.EventEnvelopeFactory;
import com.banking.ledger.application.service.RejectionRecorder;
import com.banking.ledger.application.service.TransactionResultMapper;
import com.banking.ledger.domain.exception.AccountNotFoundException;
import com.banking.ledger.domain.exception.DomainException;
import com.banking.ledger.domain.exception.JournalEntryNotFoundException;
import com.banking.ledger.domain.exception.TransactionAlreadyReversedException;
import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.model.LedgerEntry;
import com.banking.ledger.domain.port.JournalEntryRepository;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.port.OutboxEventRepository;
import com.banking.ledger.domain.vo.DebitCredit;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.github.f4b6a3.ulid.UlidCreator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ReverseTransactionUseCase {

    private final LedgerAccountRepository accountRepository;
    private final JournalEntryRepository journalRepository;
    private final OutboxEventRepository outboxRepository;
    private final EventEnvelopeFactory envelopeFactory;
    private final RejectionRecorder rejectionRecorder;

    public ReverseTransactionUseCase(
            LedgerAccountRepository accountRepository,
            JournalEntryRepository journalRepository,
            OutboxEventRepository outboxRepository,
            EventEnvelopeFactory envelopeFactory,
            RejectionRecorder rejectionRecorder
    ) {
        this.accountRepository = accountRepository;
        this.journalRepository = journalRepository;
        this.outboxRepository = outboxRepository;
        this.envelopeFactory = envelopeFactory;
        this.rejectionRecorder = rejectionRecorder;
    }

    @Transactional
    public TransactionResult execute(ReverseCommand command) {
        try {
            return doExecute(command);
        } catch (DomainException e) {
            rejectionRecorder.recordRejection(command.originalEntryId(), command.idempotencyKey(), e.getMessage());
            throw e;
        }
    }

    private TransactionResult doExecute(ReverseCommand command) {
        IdempotencyKey key = IdempotencyKey.of(command.idempotencyKey());
        Optional<JournalEntry> existing = journalRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return TransactionResultMapper.from(existing.get());
        }

        JournalEntry originalEntry = journalRepository.findById(JournalEntryId.of(command.originalEntryId()))
                .orElseThrow(() -> new JournalEntryNotFoundException(command.originalEntryId()));

        if (originalEntry.getStatus() == com.banking.ledger.domain.vo.JournalEntryStatus.REVERSED) {
            throw new TransactionAlreadyReversedException(command.originalEntryId());
        }

        JournalEntryId reversalId = JournalEntryId.generate();
        String correlationId = UlidCreator.getUlid().toString();

        List<LedgerEntry> reversalEntries = originalEntry.getEntries().stream()
                .map(entry -> entry.getType() == DebitCredit.DEBIT
                        ? LedgerEntry.credit(reversalId.toString(), entry.getLedgerAccountId(), entry.getAccountId(), entry.getAmount())
                        : LedgerEntry.debit(reversalId.toString(), entry.getLedgerAccountId(), entry.getAccountId(), entry.getAmount()))
                .toList();

        String reason = command.reason() != null ? command.reason() : "Reversal of " + originalEntry.getId();

        JournalEntry reversalEntry = JournalEntry.create(
                reversalId,
                originalEntry.getTransactionId(),
                EntryType.REVERSAL,
                key,
                reason,
                reversalEntries
        );

        Map<String, Long> previousBalances = new LinkedHashMap<>();
        List<LedgerAccount> touched = originalEntry.getEntries().stream()
                .map(entry -> {
                    LedgerAccount account = accountRepository.findById(entry.getLedgerAccountId())
                            .orElseThrow(() -> new AccountNotFoundException(entry.getLedgerAccountId().toString()));
                    previousBalances.put(account.getAccountId(), account.getBalance().toCents());
                    if (entry.getType() == DebitCredit.DEBIT) {
                        account.credit(entry.getAmount());
                    } else {
                        account.debit(entry.getAmount());
                    }
                    return account;
                })
                .sorted(Comparator.comparing(a -> a.getId().toString()))
                .toList();

        originalEntry.reverse(reversalEntry.getId().toString());

        journalRepository.save(reversalEntry);
        journalRepository.save(originalEntry);
        for (LedgerAccount account : touched) {
            accountRepository.save(account);
        }

        Instant reversedAt = reversalEntry.getCreatedAt();
        outboxRepository.save(envelopeFactory.transactionReversed(
                originalEntry,
                reversalEntry,
                reason,
                correlationId
        ));
        for (LedgerAccount account : touched) {
            outboxRepository.save(envelopeFactory.accountBalanceChanged(
                    account.getAccountId(),
                    previousBalances.get(account.getAccountId()),
                    account.getBalance().toCents(),
                    account.getCurrency(),
                    reversalEntry.getId().toString(),
                    reversedAt
            ));
        }

        return TransactionResultMapper.from(reversalEntry);
    }
}
