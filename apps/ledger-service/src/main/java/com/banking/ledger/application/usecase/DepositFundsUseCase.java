package com.banking.ledger.application.usecase;

import com.banking.ledger.application.dto.DepositCommand;
import com.banking.ledger.application.dto.TransactionResult;
import com.banking.ledger.application.service.EventEnvelopeFactory;
import com.banking.ledger.application.service.RejectionRecorder;
import com.banking.ledger.application.service.TransactionResultMapper;
import com.banking.ledger.domain.exception.AccountNotFoundException;
import com.banking.ledger.domain.exception.DomainException;
import com.banking.ledger.domain.model.JournalEntry;
import com.banking.ledger.domain.model.LedgerAccount;
import com.banking.ledger.domain.model.LedgerEntry;
import com.banking.ledger.domain.port.JournalEntryRepository;
import com.banking.ledger.domain.port.LedgerAccountRepository;
import com.banking.ledger.domain.port.OutboxEventRepository;
import com.banking.ledger.domain.service.BankCashAccountResolver;
import com.banking.ledger.domain.vo.Currency;
import com.banking.ledger.domain.vo.EntryType;
import com.banking.ledger.domain.vo.IdempotencyKey;
import com.banking.ledger.domain.vo.JournalEntryId;
import com.banking.ledger.domain.vo.Money;
import com.github.f4b6a3.ulid.UlidCreator;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class DepositFundsUseCase {

    private final LedgerAccountRepository accountRepository;
    private final JournalEntryRepository journalRepository;
    private final OutboxEventRepository outboxRepository;
    private final EventEnvelopeFactory envelopeFactory;
    private final BankCashAccountResolver bankCashResolver;
    private final RejectionRecorder rejectionRecorder;

    public DepositFundsUseCase(
            LedgerAccountRepository accountRepository,
            JournalEntryRepository journalRepository,
            OutboxEventRepository outboxRepository,
            EventEnvelopeFactory envelopeFactory,
            BankCashAccountResolver bankCashResolver,
            RejectionRecorder rejectionRecorder
    ) {
        this.accountRepository = accountRepository;
        this.journalRepository = journalRepository;
        this.outboxRepository = outboxRepository;
        this.envelopeFactory = envelopeFactory;
        this.bankCashResolver = bankCashResolver;
        this.rejectionRecorder = rejectionRecorder;
    }

    @Transactional
    public TransactionResult execute(DepositCommand command) {
        try {
            return doExecute(command);
        } catch (DomainException e) {
            rejectionRecorder.recordRejection(command.accountId(), command.idempotencyKey(), e.getMessage());
            throw e;
        }
    }

    private TransactionResult doExecute(DepositCommand command) {
        IdempotencyKey key = IdempotencyKey.of(command.idempotencyKey());
        Optional<JournalEntry> existing = journalRepository.findByIdempotencyKey(key);
        if (existing.isPresent()) {
            return TransactionResultMapper.from(existing.get());
        }

        LedgerAccount customerAccount = accountRepository.findByAccountId(command.accountId())
                .orElseThrow(() -> new AccountNotFoundException(command.accountId()));

        Currency currency = Currency.of(command.currency());
        customerAccount.assertSameCurrency(currency.code());

        Money amount = Money.ofPositive(command.amount(), currency);
        LedgerAccount bankCashAccount = bankCashResolver.resolve(currency);

        long bankCashPreviousBalance = bankCashAccount.getBalance().toCents();
        long customerPreviousBalance = customerAccount.getBalance().toCents();

        JournalEntryId journalEntryId = JournalEntryId.generate();
        String transactionId = UlidCreator.getUlid().toString();

        List<LedgerEntry> entries = List.of(
                LedgerEntry.debit(journalEntryId.toString(), bankCashAccount.getId(), bankCashAccount.getAccountId(), amount),
                LedgerEntry.credit(journalEntryId.toString(), customerAccount.getId(), customerAccount.getAccountId(), amount)
        );

        JournalEntry journalEntry = JournalEntry.create(
                journalEntryId,
                transactionId,
                EntryType.DEPOSIT,
                key,
                command.description() != null ? command.description() : "Deposit " + currency.code(),
                entries
        );

        bankCashAccount.debit(amount);
        customerAccount.credit(amount);

        journalRepository.save(journalEntry);
        accountRepository.save(bankCashAccount);
        accountRepository.save(customerAccount);

        Instant postedAt = journalEntry.getCreatedAt();
        outboxRepository.save(envelopeFactory.transactionPosted(
                journalEntry,
                amount,
                command.accountId(),
                transactionId,
                bankCashAccount.getAccountId(),
                command.accountId(),
                null
        ));
        outboxRepository.save(envelopeFactory.accountBalanceChanged(
                bankCashAccount.getAccountId(), bankCashPreviousBalance, bankCashAccount.getBalance().toCents(),
                currency.code(), journalEntry.getId().toString(), postedAt
        ));
        outboxRepository.save(envelopeFactory.accountBalanceChanged(
                command.accountId(), customerPreviousBalance, customerAccount.getBalance().toCents(),
                currency.code(), journalEntry.getId().toString(), postedAt
        ));

        return TransactionResultMapper.from(journalEntry);
    }
}
