import { describe, expect, it, mock } from "bun:test";
import { startNarrowingSpinner, startSpinner } from "./spinner.js";

describe("startNarrowingSpinner", () => {
  const runtime = (writes: string[], tty = true) => ({
    stdoutIsTTY: tty,
    stderrIsTTY: tty,
    useColors: false,
    writeStderr: (chunk: string) => {
      writes.push(String(chunk));
    },
  });

  it("draws the braille mark before the label and updates live", () => {
    const writes: string[] = [];
    const spinner = startNarrowingSpinner(
      "Researching...",
      true,
      runtime(writes),
    );
    expect(spinner.active).toBe(true);
    expect(writes[0]?.startsWith("\r\x1b[2K")).toBe(true);
    expect(writes[0]).toMatch(/[⠀-⣿]{6} Researching\.\.\.$/u);
    spinner.setStage?.("reading");
    spinner.update?.("Reading sources...");
    expect(writes.at(-1)).toMatch(/[⠀-⣿]{6} Reading sources\.\.\.$/u);
    spinner.stop();
    expect(writes.at(-1)).toBe("\r\x1b[2K");
  });

  it("stays silent and inactive outside an interactive terminal", () => {
    const writes: string[] = [];
    const spinner = startNarrowingSpinner(
      "Researching...",
      true,
      runtime(writes, false),
    );
    spinner.setStage?.("reading");
    spinner.update?.("ignored");
    spinner.stop();
    expect(spinner.active).toBe(false);
    expect(writes).toHaveLength(0);
  });

  it("colours the mark when colours are enabled", () => {
    const writes: string[] = [];
    const spinner = startNarrowingSpinner("Researching...", true, {
      ...runtime(writes),
      useColors: true,
    });
    spinner.stop();
    expect(writes[0]).toContain("\x1b[");
  });
});

describe("startSpinner", () => {
  function createRuntime(stdoutIsTTY = true, stderrIsTTY = true) {
    const writes: string[] = [];
    const writeStderr = mock((chunk: string) => {
      writes.push(String(chunk));
    });
    return { runtime: { stdoutIsTTY, stderrIsTTY, writeStderr }, writes };
  }

  it("is a no-op when disabled", () => {
    const { runtime, writes } = createRuntime();

    startSpinner("Loading...", false, runtime).stop();

    expect(writes).toHaveLength(0);
  });

  it("is a no-op when stderr is not a TTY", () => {
    const { runtime, writes } = createRuntime(true, false);

    startSpinner("Loading...", true, runtime).stop();

    expect(writes).toHaveLength(0);
  });

  it("is a no-op when stdout is not a TTY", () => {
    const { runtime, writes } = createRuntime(false, true);

    startSpinner("Loading...", true, runtime).stop();

    expect(writes).toHaveLength(0);
  });

  it("renders a frame on stderr and clears the line on stop", () => {
    const { runtime, writes } = createRuntime();

    const spinner = startSpinner("Loading...", true, runtime);
    expect(writes.some((w) => w.includes("Loading..."))).toBe(true);

    spinner.stop();
    expect(writes[writes.length - 1]).toBe("\r\x1b[2K");
  });

  it("accepts a rotating message list and shows the first label", () => {
    const { runtime, writes } = createRuntime();

    startSpinner(["First label...", "Second label..."], true, runtime).stop();

    expect(writes.some((w) => w.includes("First label..."))).toBe(true);
  });

  it("replaces the label on update and ignores updates after stop", () => {
    const { runtime, writes } = createRuntime();

    const spinner = startSpinner("Researching...", true, runtime);
    expect(spinner.active).toBe(true);
    spinner.update?.("Searching for sources...");
    expect(writes.at(-1)).toContain("Searching for sources...");
    spinner.stop();
    const count = writes.length;
    spinner.update?.("Too late...");

    expect(writes).toHaveLength(count);
  });

  it("reports inactive spinners so callers skip live progress", () => {
    const { runtime, writes } = createRuntime(false, true);

    const spinner = startSpinner("Researching...", true, runtime);
    spinner.update?.("ignored");

    expect(spinner.active).toBe(false);
    expect(writes).toHaveLength(0);
  });
});
