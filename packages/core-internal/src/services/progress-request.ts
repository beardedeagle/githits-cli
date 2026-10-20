/**
 * Optional per-call progress correlation for backend requests.
 *
 * Progress is best effort: the HTTP result stays authoritative. The backend
 * validates progress headers before admission, accounting and execution, so a
 * rejection carrying `X-GitHits-Progress-Error` means nothing ran and the same
 * request is safe to resend once without the progress headers.
 */
export interface ProgressRequest {
  /** Correlation headers merged after client headers and before auth. */
  readonly headers: Readonly<Record<string, string>>;
  /** Reports a pre-execution progress rejection; the call is then resent without progress. */
  rejected(code: string): void;
}

export const PROGRESS_ERROR_HEADER = "X-GitHits-Progress-Error";

/** Returns the backend's progress rejection code, if this response is one. */
export function readProgressRejection(response: Response): string | undefined {
  if (response.ok) return undefined;
  const code = response.headers.get(PROGRESS_ERROR_HEADER)?.trim();
  return code ? code : undefined;
}

/** Releases an unread response body before resending; failures are irrelevant. */
export async function discardResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // The connection is being abandoned either way.
  }
}
