export type TransactionContext = unknown;

export interface TransactionRunner {
  run<T>(work: (ctx: TransactionContext) => Promise<T>): Promise<T>;
}

export const TRANSACTION_RUNNER = Symbol('TRANSACTION_RUNNER');
