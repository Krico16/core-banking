import { LedgerEntryLineInput } from '../dto/ledger-entry-line.input';

/** Con las 2 líneas habituales de un asiento (debit+credit), la otra línea es la
 * contraparte de la cuenta. Con más de 2 líneas (no ocurre hoy) queda sin
 * contraparte en vez de asumir cuál es. */
export function findCounterpartAccount(
  entry: LedgerEntryLineInput,
  entries: LedgerEntryLineInput[],
): string | null {
  if (entries.length !== 2) return null;
  const other = entries.find((e) => e !== entry);
  return other ? other.accountId : null;
}
