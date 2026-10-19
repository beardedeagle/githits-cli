/**
 * Optional per-call controls shared by network-backed service methods.
 *
 * `signal` is the caller's cancellation signal, such as an MCP request
 * cancellation. Services combine it with their own request deadline: a caller
 * abort rejects with the signal's reason and is never retried, while an
 * internal deadline keeps each service's timeout error mapping.
 */
export interface ServiceRequestOptions {
  signal?: AbortSignal;
}
