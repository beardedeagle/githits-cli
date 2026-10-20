import { focusForStage, narrowingText } from "./narrowing.js";
import type { McpProgressHook, McpProgressUpdate } from "./relay-receiver.js";

/** Local animation of MCP progress messages; `false` disables it. */
export interface McpProgressAnimationOptions {
  /** Time between frames. Hosts render each frame as a notification. */
  intervalMs?: number;
}

export interface AnimatedProgressOperation {
  /** Correlation headers for the backend call; empty without live progress. */
  headers: Readonly<Record<string, string>>;
  rejected(code: string): void;
  end(): void;
}

type Emit = (progress: number, message: string) => void;

const DEFAULT_INTERVAL_MS = 500;
/** Backend stage covered by the opening message. */
export const OPENING_STAGE = "started";
/** Frames per converge-and-hit cycle at the MCP frame rate. */
const FRAMES_PER_CYCLE = 6;

/**
 * Starts one call's progress: live backend updates when available, plus
 * locally generated animation frames that re-send the latest message with the
 * narrowing mark. Frames never travel over the progress relay; they are
 * produced here and sent only to this call's client.
 *
 * MCP requires progress values to increase. Real updates use the backend
 * sequence; frames in between use fractions below the next whole number.
 */
export async function beginAnimatedProgress(
  hook: McpProgressHook | undefined,
  emit: Emit,
  initialMessage: string,
  animation: McpProgressAnimationOptions | false,
): Promise<AnimatedProgressOperation | undefined> {
  let base = 0;
  let framesSinceUpdate = 0;
  let frame = 0;
  let message = initialMessage;
  let stage: string | undefined;
  let ended = false;
  let timer: ReturnType<typeof setInterval> | undefined;

  const decorate = () =>
    `${narrowingText(frame, { period: FRAMES_PER_CYCLE, focus: focusForStage(stage) })} ${message}`;
  const onUpdate = (update: McpProgressUpdate) => {
    if (ended) return;
    // The opening message already describes the first real step; showing the
    // backend's generic "started" stage after it would look like a step back.
    if (update.stage === OPENING_STAGE) return;
    base = update.progress;
    framesSinceUpdate = 0;
    message = update.message;
    stage = update.stage;
    emit(base, animation ? decorate() : message);
  };

  const live = hook ? await hook.begin(onUpdate) : undefined;
  if (!animation && !live) return undefined;

  if (animation) {
    emit(base, decorate());
    timer = setInterval(() => {
      framesSinceUpdate += 1;
      frame += 1;
      emit(base + framesSinceUpdate / (framesSinceUpdate + 1), decorate());
    }, animation.intervalMs ?? DEFAULT_INTERVAL_MS);
    // The animation must never keep a process alive.
    (timer as { unref?: () => void }).unref?.();
  }

  return {
    headers: live?.headers ?? {},
    rejected: (code) => live?.rejected(code),
    end: () => {
      if (ended) return;
      ended = true;
      if (timer) clearInterval(timer);
      live?.end();
    },
  };
}
