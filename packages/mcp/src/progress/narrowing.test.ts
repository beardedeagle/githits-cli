import { describe, expect, it } from "bun:test";
import { focusForStage, narrowingFrame, narrowingText } from "./narrowing.js";

const isBraille = (char: string) =>
  char.codePointAt(0)! >= 0x2800 && char.codePointAt(0)! <= 0x28ff;

describe("narrowingFrame", () => {
  it("renders braille cells of the requested width", () => {
    for (const frame of [0, 7, 22, 29]) {
      const cells = narrowingFrame(frame, { width: 6, period: 30 });
      expect(cells).toHaveLength(6);
      expect(cells.every((cell) => isBraille(cell.char))).toBe(true);
    }
  });

  it("is deterministic and cyclic", () => {
    expect(narrowingText(4, { period: 30 })).toBe(
      narrowingText(4, { period: 30 }),
    );
    expect(narrowingText(4, { period: 30 })).toBe(
      narrowingText(34, { period: 30 }),
    );
  });

  it("converges from a scatter to a single bright hit each cycle", () => {
    const start = narrowingFrame(0, { width: 6, period: 30 });
    const hit = narrowingFrame(27, { width: 6, period: 30 });
    const litCells = (cells: typeof start) =>
      cells.filter((cell) => cell.char !== "⠀").length;
    expect(litCells(start)).toBeGreaterThan(2);
    expect(litCells(hit)).toBe(1);
    expect(Math.max(...hit.map((cell) => cell.tone))).toBe(1);
    expect(Math.max(...start.map((cell) => cell.tone))).toBeLessThan(0.5);
  });

  it("starts each cycle tighter as focus increases and holds the hit at 1", () => {
    const spread = (focus: number) =>
      narrowingFrame(0, { width: 6, period: 30, focus }).filter(
        (cell) => cell.char !== "⠀",
      ).length;
    expect(spread(0.85)).toBeLessThanOrEqual(spread(0));
    for (const frame of [0, 10, 20]) {
      expect(narrowingText(frame, { focus: 1 })).toBe(
        narrowingText(27, { period: 30 }),
      );
    }
  });
});

describe("focusForStage", () => {
  it("narrows monotonically through the research stages", () => {
    const stages = [
      "started",
      "searching",
      "searching_related",
      "reading",
      "ranking",
      "verifying",
      "answering",
      "completed",
    ];
    const values = stages.map(focusForStage);
    expect(values).toEqual([...values].sort((a, b) => a - b));
    expect(focusForStage(undefined)).toBe(0);
    expect(focusForStage("completed")).toBe(1);
  });
});
