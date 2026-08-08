interface PollOptions {
  timeoutMs?: number;
  intervalMs?: number;
  description?: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_INTERVAL_MS = 1_000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reintenta `fn` hasta que `predicate` acepte el resultado o se agote el timeout.
 * Usado para esperar consistencia eventual (eventos Kafka, proyecciones CQRS,
 * saga de pagos) sin encadenar `sleep`s fijos arbitrarios.
 */
export async function pollUntil<T>(
  fn: () => Promise<T>,
  predicate: (result: T) => boolean,
  options: PollOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;

  let lastResult: T;
  do {
    lastResult = await fn();
    if (predicate(lastResult)) {
      return lastResult;
    }
    await sleep(intervalMs);
  } while (Date.now() < deadline);

  const label = options.description ? ` (${options.description})` : '';
  throw new Error(`pollUntil timed out after ${timeoutMs}ms${label}. Last result: ${JSON.stringify(lastResult)}`);
}
