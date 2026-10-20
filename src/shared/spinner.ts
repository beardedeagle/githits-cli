import {
  colorizeBrand,
  colorizeTerminal,
  focusForStage,
  narrowingFrame,
  type TerminalColor,
} from "@githits/mcp/internal";

const SPINNER_FRAMES = ["|", "/", "-", "\\"] as const;
const FRAME_INTERVAL_MS = 80;
const MESSAGE_INTERVAL_MS = 2000;

/** Handle for an active spinner. */
export interface Spinner {
  /** Stop the animation and clear the spinner line. */
  stop(): void;
  /** Whether frames are being rendered (an interactive terminal). */
  readonly active?: boolean;
  /** Replace the label with one fixed message, such as live progress. */
  update?(label: string): void;
  /** Report the current backend stage so the mark can narrow with it. */
  setStage?(stage: string | undefined): void;
}

interface SpinnerRuntime {
  stdoutIsTTY?: boolean;
  stderrIsTTY?: boolean;
  writeStderr?: (chunk: string) => void;
  useColors?: boolean;
}

/**
 * Start an animated progress spinner on stderr.
 *
 * Renders only when stdout and stderr are interactive TTYs, so piped output,
 * `--json` consumers, and agent/MCP callers never see spinner frames.
 * Writing to stderr keeps stdout (the command result) clean when interactive.
 *
 * Pass an array of labels to rotate them every ~2s while the glyph
 * keeps spinning; a single string stays fixed.
 */
export function startSpinner(
  message: string | readonly string[],
  enabled = true,
  runtime: SpinnerRuntime = {},
): Spinner {
  const stdoutIsTTY = runtime.stdoutIsTTY ?? process.stdout.isTTY;
  const stderrIsTTY = runtime.stderrIsTTY ?? process.stderr.isTTY;
  const writeStderr =
    runtime.writeStderr ?? ((chunk) => process.stderr.write(chunk));

  if (!enabled || !stdoutIsTTY || !stderrIsTTY) {
    return { active: false, stop: () => {}, update: () => {} };
  }

  let messages = typeof message === "string" ? [message] : message;
  const framesPerMessage = Math.round(MESSAGE_INTERVAL_MS / FRAME_INTERVAL_MS);
  const useColors = runtime.useColors ?? process.env.NO_COLOR === undefined;
  let frame = 0;
  const render = (): void => {
    const glyph = SPINNER_FRAMES[frame % SPINNER_FRAMES.length] ?? "|";
    const label =
      messages[Math.floor(frame / framesPerMessage) % messages.length] ?? "";
    frame += 1;
    writeStderr(
      `\r\x1b[2K${colorizeBrand(glyph, "primary", useColors)} ${label}`,
    );
  };

  render();
  const interval = setInterval(render, FRAME_INTERVAL_MS);

  let stopped = false;
  return {
    active: true,
    stop: () => {
      stopped = true;
      clearInterval(interval);
      writeStderr("\r\x1b[2K");
    },
    update: (label) => {
      if (stopped) return;
      messages = [label];
      render();
    },
  };
}

// Narrowing mark colours: dim candidates, Solar Orange while converging,
// Laser Magenta for the hit (brand tokens neutral.border, secondary.500,
// primary.500).
const CANDIDATE: TerminalColor = {
  hex: "#4A4E56",
  rgb: [74, 78, 86],
  ansi256: 239,
  ansi16: "yellow",
};
const CONVERGING: TerminalColor = {
  hex: "#FF872F",
  rgb: [255, 135, 47],
  ansi256: 208,
  ansi16: "yellow",
};
const HIT: TerminalColor = {
  hex: "#FF4FAE",
  rgb: [255, 79, 174],
  ansi256: 205,
  ansi16: "magenta",
};
const NARROWING_WIDTH = 6;
/** ~2.4 s per converge-and-hit cycle at 80 ms frames. */
const NARROWING_PERIOD = 30;

/**
 * Start the GitHits "narrowing scatter" spinner: candidate dots converge on
 * one hit, tightening as live progress reports later stages. Same TTY rules
 * as {@link startSpinner}.
 */
export function startNarrowingSpinner(
  message: string,
  enabled = true,
  runtime: SpinnerRuntime = {},
): Spinner {
  const stdoutIsTTY = runtime.stdoutIsTTY ?? process.stdout.isTTY;
  const stderrIsTTY = runtime.stderrIsTTY ?? process.stderr.isTTY;
  const writeStderr =
    runtime.writeStderr ?? ((chunk) => process.stderr.write(chunk));
  if (!enabled || !stdoutIsTTY || !stderrIsTTY) {
    return {
      active: false,
      stop: () => {},
      update: () => {},
      setStage: () => {},
    };
  }

  const useColors = runtime.useColors ?? process.env.NO_COLOR === undefined;
  let label = message;
  let focus = 0;
  let frame = 0;
  let stopped = false;
  const render = (): void => {
    const mark = narrowingFrame(frame, {
      width: NARROWING_WIDTH,
      period: NARROWING_PERIOD,
      focus,
    })
      .map(({ char, tone }) =>
        tone >= 0.9
          ? colorizeTerminal(char, HIT, useColors)
          : tone >= 0.5
            ? colorizeTerminal(char, CONVERGING, useColors)
            : colorizeTerminal(char, CANDIDATE, useColors, { dim: true }),
      )
      .join("");
    frame += 1;
    writeStderr(`\r\x1b[2K${mark} ${label}`);
  };

  render();
  const interval = setInterval(render, FRAME_INTERVAL_MS);
  return {
    active: true,
    stop: () => {
      stopped = true;
      clearInterval(interval);
      writeStderr("\r\x1b[2K");
    },
    update: (next) => {
      if (stopped) return;
      label = next;
      render();
    },
    setStage: (stage) => {
      focus = focusForStage(stage);
    },
  };
}
