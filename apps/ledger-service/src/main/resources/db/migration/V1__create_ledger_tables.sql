-- V1__create_ledger_tables.sql

-- Chart of accounts (referencia a account-service, una por cuenta bancaria)
CREATE TABLE ledger_accounts (
    id VARCHAR(26) PRIMARY KEY,
    account_id VARCHAR(26) NOT NULL UNIQUE,        -- Referencia a account-service
    account_number VARCHAR(20) NOT NULL,
    account_type VARCHAR(20) NOT NULL,             -- ASSET, LIABILITY
    currency VARCHAR(3) NOT NULL,
    balance_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    available_balance_amount NUMERIC(19, 4) NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_accounts_account_id ON ledger_accounts(account_id);

-- Journal entries (cabecera de transacción contable)
CREATE TABLE journal_entries (
    id VARCHAR(26) PRIMARY KEY,
    transaction_id VARCHAR(26) NOT NULL,            -- ID de la operación de negocio (paymentId)
    entry_type VARCHAR(30) NOT NULL,                -- DEPOSIT, WITHDRAWAL, TRANSFER, REVERSAL
    status VARCHAR(20) NOT NULL DEFAULT 'POSTED',   -- POSTED, REVERSED
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,   -- Clave de idempotencia
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reversed_at TIMESTAMPTZ,
    reversed_by_entry_id VARCHAR(26)
);

CREATE INDEX idx_journal_entries_transaction_id ON journal_entries(transaction_id);
CREATE UNIQUE INDEX idx_journal_entries_idempotency_key ON journal_entries(idempotency_key);

-- Ledger entries (líneas de débito/crédito)
CREATE TABLE ledger_entries (
    id VARCHAR(26) PRIMARY KEY,
    journal_entry_id VARCHAR(26) NOT NULL REFERENCES journal_entries(id),
    ledger_account_id VARCHAR(26) NOT NULL REFERENCES ledger_accounts(id),
    entry_type VARCHAR(10) NOT NULL,                -- DEBIT, CREDIT
    amount NUMERIC(19, 4) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ledger_entries_journal_entry_id ON ledger_entries(journal_entry_id);
CREATE INDEX idx_ledger_entries_ledger_account_id ON ledger_entries(ledger_account_id);

-- Outbox events (patrón transactional outbox)
CREATE TABLE outbox_events (
    id VARCHAR(26) PRIMARY KEY,
    aggregate_id VARCHAR(26) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',  -- PENDING, PUBLISHED, FAILED
    retry_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    published_at TIMESTAMPTZ,
    error TEXT
);

CREATE INDEX idx_outbox_events_status ON outbox_events(status) WHERE status = 'PENDING';
CREATE INDEX idx_outbox_events_created_at ON outbox_events(created_at);

-- Processed events (idempotencia de consumidores)
CREATE TABLE processed_events (
    event_id VARCHAR(26) PRIMARY KEY,
    consumer_name VARCHAR(100) NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_processed_events_consumer ON processed_events(consumer_name);

-- Constraint: balance nunca puede ser negativo para cuentas de clientes
ALTER TABLE ledger_accounts 
ADD CONSTRAINT chk_balance_non_negative 
CHECK (balance_amount >= 0);

-- Constraint: available balance no puede exceder balance
ALTER TABLE ledger_accounts 
ADD CONSTRAINT chk_available_le_balance 
CHECK (available_balance_amount <= balance_amount);
