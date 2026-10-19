import type { ServiceRequestOptions } from "@githits/core-internal";

/** Trailing service-call arguments that carry an optional caller signal. */
export type ServiceRequestArgs = [] | [ServiceRequestOptions];

/**
 * Forward a caller's cancellation signal to a network-backed service call.
 * Without a signal the call keeps its original single-argument shape, so
 * existing callers and injected services see no change.
 */
export function serviceRequestArgs(
  signal: AbortSignal | undefined,
): ServiceRequestArgs {
  return signal ? [{ signal }] : [];
}
