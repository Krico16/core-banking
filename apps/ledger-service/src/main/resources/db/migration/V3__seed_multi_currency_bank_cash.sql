-- V3__seed_multi_currency_bank_cash.sql
-- One bank cash ASSET account per supported currency (counterpart for deposit/withdraw)

INSERT INTO ledger_accounts (
    id, account_id, account_number, account_type, currency,
    balance_amount, available_balance_amount, version, created_at, updated_at
)
SELECT v.id, v.account_id, v.account_number, 'ASSET', v.currency, 0, 0, 0, now(), now()
FROM (VALUES
    ('01KYN1USD00000000000000001', 'BANK_CASH_USD', 'BANK_CASH_USD', 'USD'),
    ('01KYN1GBP00000000000000001', 'BANK_CASH_GBP', 'BANK_CASH_GBP', 'GBP'),
    ('01KYN1CHF00000000000000001', 'BANK_CASH_CHF', 'BANK_CASH_CHF', 'CHF'),
    ('01KYN1JPY00000000000000001', 'BANK_CASH_JPY', 'BANK_CASH_JPY', 'JPY'),
    ('01KYN1MXN00000000000000001', 'BANK_CASH_MXN', 'BANK_CASH_MXN', 'MXN'),
    ('01KYN1COP00000000000000001', 'BANK_CASH_COP', 'BANK_CASH_COP', 'COP'),
    ('01KYN1ARS00000000000000001', 'BANK_CASH_ARS', 'BANK_CASH_ARS', 'ARS'),
    ('01KYN1CLP00000000000000001', 'BANK_CASH_CLP', 'BANK_CASH_CLP', 'CLP'),
    ('01KYN1BRL00000000000000001', 'BANK_CASH_BRL', 'BANK_CASH_BRL', 'BRL'),
    ('01KYN1PEN00000000000000001', 'BANK_CASH_PEN', 'BANK_CASH_PEN', 'PEN')
) AS v(id, account_id, account_number, currency)
WHERE NOT EXISTS (
    SELECT 1 FROM ledger_accounts la WHERE la.account_id = v.account_id
);
