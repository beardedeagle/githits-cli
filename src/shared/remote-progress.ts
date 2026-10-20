import type { TokenProvider } from "@githits/core-internal";
import {
  type McpProgressHook,
  type McpProgressOperation,
  OPENING_STAGE,
  openingResearchMessage,
  RelayReceiver,
} from "@githits/mcp/internal";
import type { Spinner } from "./spinner.js";

/**
 * Creates the per-command progress receiver, authorized by the CLI's own
 * token, and starts connecting right away so live updates can arrive as early
 * as possible. Returns `undefined` when output is not an interactive terminal,
 * where no progress is shown.
 */
export function createCommandProgress(
  deps: { apiUrl: string; tokenProvider: TokenProvider },
  interactive = Boolean(process.stdout.isTTY && process.stderr.isTTY),
): RelayReceiver | undefined {
  if (!interactive) return undefined;
  const receiver = new RelayReceiver({
    apiUrl: deps.apiUrl,
    auth: { kind: "caller", getToken: () => deps.tokenProvider.getToken() },
  });
  receiver.warm();
  return receiver;
}

/** The research spinner's opening label, mirroring the backend's first stage. */
export function openingResearchLabel(target: string | undefined): string {
  return toSpinnerLabel(openingResearchMessage(target));
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
      // The opening label already covers the backend's generic first stage.
      if (stage === OPENING_STAGE) return;
      spinner.setStage?.(stage);
      spinner.update?.(toSpinnerLabel(message));
    });
  } catch {
    // Progress is best effort; the command runs exactly as without it.
    return undefined;
  }
}

/**
 * Matches the CLI's spinner style. Running stages end in "..." (the backend
 * sends "…"); outcome messages such as "Ready" are shown as they are.
 */
export function toSpinnerLabel(message: string): string {
  const text = message.trim();
  if (!text) return "Working...";
  const running = text.replace(/(\.{3}|…|\.)$/u, "");
  return running === text ? text : `${running}...`;
}
