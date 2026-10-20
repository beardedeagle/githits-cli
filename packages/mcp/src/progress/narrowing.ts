/**
 * "Narrowing scatter" progress mark: candidate dots converge on one precise
 * hit, mirroring how research narrows from many sources to specific files and
 * symbols. Drawn with braille cells (2x4 dots each) so it renders as plain
 * text in terminals and MCP hosts.
 */

/** One rendered braille cell; `tone` runs from 0 (dim candidate) to 1 (hit). */
export interface NarrowingCell {
  char: string;
  tone: number;
}

export interface NarrowingFrameOptions {
  /** Width in braille cells. */
  width?: number;
  /** Frames per converge-and-hit cycle. */
  period?: number;
  /**
   * How far the run has narrowed, from 0 (just started) to 1 (answer ready).
   * Later stages start each cycle from a tighter cluster; 1 holds the hit.
   */
  focus?: number;
}

const BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
] as const;
const CANDIDATES = 14;
/** Share of each cycle spent converging; the remainder shows the hit. */
const CONVERGE = 0.75;

/** Stable pseudo-random value in [0, 1) so frames are deterministic. */
function seeded(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/** Renders frame `frame` of the narrowing mark. */
export function narrowingFrame(
  frame: number,
  options: NarrowingFrameOptions = {},
): NarrowingCell[] {
  const width = options.width ?? 6;
  const period = options.period ?? 30;
  const focus = Math.min(1, Math.max(0, options.focus ?? 0));
  const codes = new Array<number>(width).fill(0);
  const tones = new Array<number>(width).fill(0);
  const light = (x: number, y: number, tone: number) => {
    const cell = Math.floor(x / 2);
    if (cell < 0 || cell >= width || y < 0 || y > 3) return;
    codes[cell] = (codes[cell] ?? 0) | (BITS[y]?.[x % 2] ?? 0);
    tones[cell] = Math.max(tones[cell] ?? 0, tone);
  };

  const cx = width - 1;
  const phase = (((frame % period) + period) % period) / period;
  if (focus >= 1 || phase >= CONVERGE) {
    // The hit: a bright two-dot point at the centre.
    light(cx, 1, 1);
    light(cx, 2, 1);
  } else {
    const spread = (1 - focus * 0.7) * (1 - phase / CONVERGE);
    for (let i = 0; i < CANDIDATES; i++) {
      const x = Math.round(cx + (seeded(i) * 2 - 1) * width * spread);
      const y = Math.round(1.5 + (seeded(i + 50) * 4 - 2) * spread);
      light(x, y, 0.2 + 0.6 * (1 - spread));
    }
  }
  return codes.map((code, i) => ({
    char: String.fromCharCode(0x2800 + code),
    tone: tones[i] ?? 0,
  }));
}

/** Plain-text frame for hosts without colour, such as MCP clients. */
export function narrowingText(
  frame: number,
  options?: NarrowingFrameOptions,
): string {
  return narrowingFrame(frame, options)
    .map((cell) => cell.char)
    .join("");
}

/** How far a backend progress stage has narrowed the work, for `focus`. */
export function focusForStage(stage: string | undefined): number {
  switch (stage) {
    case "searching":
      return 0.2;
    case "searching_related":
      return 0.35;
    case "reading":
      return 0.45;
    case "ranking":
      return 0.6;
    case "verifying":
      return 0.75;
    case "answering":
    case "generating":
    case "explaining":
      return 0.85;
    case "completed":
      return 1;
    default:
      return 0;
  }
}
