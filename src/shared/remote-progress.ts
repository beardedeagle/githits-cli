import type { TokenProvider } from "@githits/core-internal";
import {
  type McpProgressHook,
  type McpProgressOperation,
  RelayReceiver,
} from "@githits/mcp/internal";
import type { Spinner } from "./spinner.js";

/**
 * Creates the per-command progress receiver, authorized by the CLI's own
 * token. Nothing connects until a command begins a progress operation.
 */
export function createCommandProgress(deps: {
  apiUrl: string;
  tokenProvider: TokenProvider;
}): RelayReceiver {
  return new RelayReceiver({
    apiUrl: deps.apiUrl,
    auth: { kind: "caller", getToken: () => deps.tokenProvider.getToken() },
  });
}

/**
 * Drive an interactive spinner from live backend progress.
 *
 * Returns the progress request to attach to the backend call, or `undefined`
 * when the spinner is not rendering (piped output, `--json`) or progress is
 * unavailable. Never waits for the progress connection.
 */
export async function beginSpinnerProgress(
  spinner: Spinner,
  hook: McpProgressHook | undefined,
): Promise<McpProgressOperation | undefined> {
  if (!hook || !spinner.active) return undefined;
  try {
    return await hook.begin(({ message, stage }) => {
      spinner.setStage?.(stage);
      spinner.update?.(toSpinnerLabel(message));
    });
  } catch {
    // Progress is best effort; the command runs exactly as without it.
    return undefined;
  }
}

/** Matches the CLI's spinner style: no trailing period, ending in "...". */
export function toSpinnerLabel(message: string): string {
  const text = message.trim().replace(/(\.{3}|…|\.)$/u, "");
  return text ? `${text}...` : "Working...";
}
