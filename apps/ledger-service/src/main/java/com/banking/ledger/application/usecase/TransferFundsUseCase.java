package com.banking.ledger.application.usecase;

import com.banking.ledger.application.dto.TransactionResult;
import com.banking.ledger.application.dto.TransferCommand;
import com.banking.ledger.application.service.EventEnvelopeFactory;
import com.banking.ledger.application.service.RejectionRecorder;
import com.banking.ledger.application.service.TransactionResultMapper;
import com.banking.ledger.domain.exception.AccountNotFoundException;
import com.banking.ledger.domain.exception.CurrencyMismatchException;
import com.banking.ledger.domain.exception.DomainException;
import com.banking.ledger.domain.exception.InvalidTransferException;
import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.model.LedgerEntry;
import com.banking.ledger.domain.port.JournalEntryRepository;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.port.OutboxEventRepository;
import com.banking.ledger.domain.vo.Currency;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.domain.vo.Money;
import com.github.f4b6a3.ulid.UlidCreator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Service
public class TransferFundsUseCase {

    private final LedgerAccountRepository accountRepository;
    private final JournalEntryRepository journalRepository;
    private final OutboxEventRepository outboxRepository;
    private final EventEnvelopeFactory envelopeFactory;
    private final RejectionRecorder rejectionRecorder;

    public TransferFundsUseCase(
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
    public TransactionResult execute(TransferCommand command) {
        try {
            return doExecute(command);
        } catch (DomainException e) {
            rejectionRecorder.recordRejection(command.sourceAccountId(), command.idempotencyKey(), e.getMessage());
            throw e;
        }
    }

    private TransactionResult doExecute(TransferCommand command) {
        if (command.sourceAccountId().equals(command.targetAccountId())) {
            throw new InvalidTransferException("Source and target accounts must be different");
        }

        IdempotencyKey key = IdempotencyKey.of(command.idempotencyKey());
        Optional<JournalEntry> existing = journalRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return TransactionResultMapper.from(existing.get());
        }

        LedgerAccount sourceAccount = accountRepository.findByAccountId(command.sourceAccountId())
                .orElseThrow(() -> new AccountNotFoundException(command.sourceAccountId()));

        LedgerAccount targetAccount = accountRepository.findByAccountId(command.targetAccountId())
                .orElseThrow(() -> new AccountNotFoundException(command.targetAccountId()));

        if (!sourceAccount.getCurrency().equals(targetAccount.getCurrency())) {
            throw new CurrencyMismatchException(
                    "Cross-currency transfer is not supported. Source="
                            + sourceAccount.getCurrency() + " target=" + targetAccount.getCurrency()
                            + ". Use FX service for currency conversion."
            );
        }

        Currency currency = Currency.of(command.currency());
        sourceAccount.assertSameCurrency(currency.code());

        Money amount = Money.ofPositive(command.amount(), currency);
        JournalEntryId journalEntryId = JournalEntryId.generate();
        String transactionId = UlidCreator.getUlid().toString();

        long sourcePreviousBalance = sourceAccount.getBalance().toCents();
        long targetPreviousBalance = targetAccount.getBalance().toCents();

        List<LedgerEntry> entries = List.of(
                LedgerEntry.debit(journalEntryId.toString(), sourceAccount.getId(), sourceAccount.getAccountId(), amount),
                LedgerEntry.credit(journalEntryId.toString(), targetAccount.getId(), targetAccount.getAccountId(), amount)
        );

        JournalEntry journalEntry = JournalEntry.create(
                journalEntryId,
                transactionId,
                EntryType.TRANSFER,
                key,
                command.description() != null ? command.description() : "Transfer " + currency.code(),
                entries
        );

        List<LedgerAccount> ordered = List.of(sourceAccount, targetAccount).stream()
                .sorted(Comparator.comparing(a -> a.getId().toString()))
                .toList();

        sourceAccount.debit(amount);
        targetAccount.credit(amount);

        journalRepository.save(journalEntry);
        for (LedgerAccount account : ordered) {
            accountRepository.save(account);
        }

        Instant postedAt = journalEntry.getCreatedAt();
        outboxRepository.save(envelopeFactory.transactionPosted(
                journalEntry,
                amount,
                command.sourceAccountId(),
                transactionId,
                command.sourceAccountId(),
                command.targetAccountId(),
                command.paymentId()
        ));
        outboxRepository.save(envelopeFactory.accountBalanceChanged(
                command.sourceAccountId(), sourcePreviousBalance, sourceAccount.getBalance().toCents(),
                currency.code(), journalEntry.getId().toString(), postedAt
        ));
        outboxRepository.save(envelopeFactory.accountBalanceChanged(
                command.targetAccountId(), targetPreviousBalance, targetAccount.getBalance().toCents(),
                currency.code(), journalEntry.getId().toString(), postedAt
        ));

        return TransactionResultMapper.from(journalEntry);
    }
}
