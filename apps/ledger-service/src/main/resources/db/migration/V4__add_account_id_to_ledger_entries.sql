-- V4__add_account_id_to_ledger_entries.sql
--
-- ledger_entries solo guardaba ledger_account_id (la PK interna de
-- ledger_accounts). Los eventos de dominio (LedgerTransactionPosted/Reversed)
-- y la respuesta REST reusaban ese mismo id como si fuera la referencia externa
-- a account-service, rompiendo cualquier consumidor que correlacione por el
-- accountId real (ej. las proyecciones de query-service). Se agrega la columna
-- correcta, respaldada desde ledger_accounts para las filas existentes.

ALTER TABLE ledger_entries ADD COLUMN account_id VARCHAR(26);

UPDATE ledger_entries le
SET account_id = la.account_id
FROM ledger_accounts la
WHERE le.ledger_account_id = la.id;

ALTER TABLE ledger_entries ALTER COLUMN account_id SET NOT NULL;

CREATE INDEX idx_ledger_entries_account_id ON ledger_entries(account_id);
