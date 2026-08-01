-- V2__seed_bank_cash_account.sql

-- Cuenta de efectivo del banco (activo del banco)
-- Se usa como contrapartida en depósitos y retiros
INSERT INTO ledger_accounts (
    id,
    account_id,
    account_number,
    account_type,
    currency,
    balance_amount,
    available_balance_amount,
    version,
    created_at,
    updated_at
) VALUES (
    '01KYDDNHH2K38MWSWW1S0KK9AQ',
    'BANK_CASH_EUR',
    'BANK_CASH_001',
    'ASSET',
    'EUR',
    0,
    0,
    0,
    now(),
    now()
);
