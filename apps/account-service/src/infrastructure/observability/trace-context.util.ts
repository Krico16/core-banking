import { ROOT_CONTEXT, SpanContext, TraceFlags, context, trace } from '@opentelemetry/api';

const TRACE_ID_RE = /^[0-9a-f]{32}$/;
const SPAN_ID_RE = /^[0-9a-f]{16}$/;

/**
 * The outbox worker runs on a disconnected @Interval tick, not inside the
 * request/consumer span that originally caused the event, so kafkajs's
 * auto-instrumentation would otherwise start a brand new, unrelated trace for
 * every publish. correlationId/causationId in the envelope ARE an OTel
 * traceId/spanId pair (see event-envelope.util.ts) — re-parenting the active
 * context from them before calling the producer lets the injected
 * `traceparent` header continue the trace that actually caused the event.
 */
export function withEventTraceContext<T>(
  correlationId: string | undefined,
  causationId: string | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  if (
    !correlationId ||
    !causationId ||
    !TRACE_ID_RE.test(correlationId) ||
    !SPAN_ID_RE.test(causationId)
  ) {
    return fn();
  }

  const spanContext: SpanContext = {
    traceId: correlationId,
    spanId: causationId,
    traceFlags: TraceFlags.SAMPLED,
    isRemote: true,
  };

  return context.with(trace.setSpanContext(ROOT_CONTEXT, spanContext), fn);
}
