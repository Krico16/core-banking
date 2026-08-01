package com.banking.ledger.domain.model;

import com.banking.ledger.domain.vo.DebitCredit;
import com.banking.ledger.domain.vo.LedgerAccountId;
import com.banking.ledger.domain.vo.Money;
import com.github.f4b6a3.ulid.UlidCreator;

public class LedgerEntry {

    private final String id;
    private final String journalEntryId;
    private final LedgerAccountId ledgerAccountId;
    private final String accountId;
    private final DebitCredit type;
    private final Money amount;

    private LedgerEntry(
            String id,
            String journalEntryId,
            LedgerAccountId ledgerAccountId,
            String accountId,
            DebitCredit type,
            Money amount
    ) {
        this.id = id;
        this.journalEntryId = journalEntryId;
        this.ledgerAccountId = ledgerAccountId;
        this.accountId = accountId;
        this.type = type;
        this.amount = amount;
    }

    public static LedgerEntry debit(
            String journalEntryId,
            LedgerAccountId ledgerAccountId,
            String accountId,
            Money amount
    ) {
        return new LedgerEntry(
                UlidCreator.getUlid().toString(),
                journalEntryId,
                ledgerAccountId,
                accountId,
                DebitCredit.DEBIT,
                amount
        );
    }

    public static LedgerEntry credit(
            String journalEntryId,
            LedgerAccountId ledgerAccountId,
            String accountId,
            Money amount
    ) {
        return new LedgerEntry(
                UlidCreator.getUlid().toString(),
                journalEntryId,
                ledgerAccountId,
                accountId,
                DebitCredit.CREDIT,
                amount
        );
    }

    public static LedgerEntry reconstruct(
            String id,
            String journalEntryId,
            LedgerAccountId ledgerAccountId,
            String accountId,
            DebitCredit type,
            Money amount
    ) {
        return new LedgerEntry(id, journalEntryId, ledgerAccountId, accountId, type, amount);
    }

    // Getters
    public String getId() { return id; }
    public String getJournalEntryId() { return journalEntryId; }
    public LedgerAccountId getLedgerAccountId() { return ledgerAccountId; }
    /** Referencia externa a account-service — usar esta para correlacionar entre servicios, no getLedgerAccountId(). */
    public String getAccountId() { return accountId; }
    public DebitCredit getType() { return type; }
    public Money getAmount() { return amount; }
}
