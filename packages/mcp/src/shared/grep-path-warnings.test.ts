import { describe, expect, it } from "bun:test";
import { type GrepPathWarning, parseGrepResult } from "@githits/core-internal";
import mixed from "./fixtures/grep-text/mixed-100.json";
import { projectGrepResult } from "./grep-response.js";
import { formatGrepText } from "./grep-text.js";

const warning: GrepPathWarning = {
  requestedInputIndices: [2, 0],
  target: "npm:x",
  path: "packages/x/src",
  repositorySubpath: "packages/x",
  message:
    'Package paths are relative to the package root. Did you mean target "npm:x" with path "src"?',
  suggestions: [
    { target: "npm:x", path: "src" },
    { target: `github:o/r@${"a".repeat(40)}`, path: "packages/x/src" },
  ],
};

function page() {
  return {
    ...parseGrepResult(mixed),
    pathWarnings: structuredClone([
      warning,
      { ...warning, path: "packages/x/test", requestedInputIndices: [1] },
    ]),
  };
}

describe("grep path advisories", () => {
  it("preserves every field and ordered input index without aliasing provider data", () => {
    const input = page();
    const before = structuredClone(input);
    const projected = projectGrepResult(input);
    expect(projected).toEqual(before);
    projected.pathWarnings[0]!.requestedInputIndices.push(5);
    projected.pathWarnings[0]!.suggestions[0]!.path = "changed";
    projected.pathWarnings[1]!.message = "changed";
    expect(input).toEqual(before);
  });

  it("keeps advisories, real matches, coverage failures, public messages and cursors together", () => {
    const input = page();
    Object.assign(input.targets[0]!, {
      traversal: "FAILED",
      errorCode: "GREP_PATH_NOT_INDEXED",
      publicMessage: "The requested exact path is not indexed.",
      retryable: false,
    });
    input.traversal = "NON_RESUMABLE_PARTIAL";
    const before = structuredClone(input);
    const text = formatGrepText(input);
    expect(text).toContain("Found 100 matches");
    expect(text).toContain("GREP_PATH_NOT_INDEXED");
    expect(text).toContain("The requested exact path is not indexed.");
    expect(text).toContain("Path advisories:");
    expect(text.split("Package paths are relative")).toHaveLength(3);
    expect(text).toContain(
      `target='github:o/r@${"a".repeat(40)}' path='packages/x/src'`,
    );
    expect(text).toContain("--cursor");
    expect(text).toContain("100");
    expect(input).toEqual(before);
  });

  for (const syntax of ["cli", "mcp"] as const) {
    it(`shows a successful zero-hit advisory in ${syntax} without inventing a failure`, () => {
      const input = page();
      Object.assign(input, {
        hits: [],
        totalMatches: 0,
        traversal: "COMPLETE",
        nextCursor: null,
      });
      for (const target of input.targets)
        Object.assign(target, { traversal: "COMPLETE", readiness: "CURRENT" });
      const text = formatGrepText(input, { syntax });
      expect(text).toStartWith("No matches found.");
      expect(text).toContain("Path advisories:");
      expect(text).toContain("Unverified alternatives");
      expect(text).not.toContain("search failed");
      expect(text).not.toContain("still being prepared");
      expect(text).not.toContain("Retry");
    });

    it(`quotes exact ${syntax} pairs with spaces, quotes, metacharacters and controls without wrapping`, async () => {
      const input = page();
      const target = `github:o/weird repo'";$()\\name@${"b".repeat(40)}`;
      const path = "src/a 'quoted' \"file\";$HOME`echo nope`\\é\n\u001b[31m.ts";
      input.pathWarnings = [
        {
          ...warning,
          message: "Public\u001b[31m message",
          suggestions: [{ target, path }],
        },
      ];
      const text = formatGrepText(input, {
        syntax,
        width: 35,
        useColors: false,
      });
      expect(text).toContain("Public\\u001b[31m message");
      expect(text).not.toContain("\u001b");
      const row = text.split("\n").find((line) => line.startsWith("      "))!;
      expect(row.length).toBeGreaterThan(35);
      if (syntax === "mcp") {
        expect(JSON.parse(row.trim())).toEqual({ target, path });
      } else {
        expect(row).toStartWith(
          "      target='github:o/weird repo'\"'\"'\";$()\\name@",
        );
        expect(row).toContain(" path=$'src/");
        // Bash is not a Windows prerequisite; quote structure is asserted on every host.
        if (process.platform === "win32") return;
        // Execute assignments only: quoted substitutions must remain literal data.
        const child = Bun.spawn(
          ["bash", "-c", `${row.trim()}; printf '%s\\0%s' "$target" "$path"`],
          { stdout: "pipe", stderr: "pipe" },
        );
        expect(await new Response(child.stdout).text()).toBe(
          `${target}\0${path}`,
        );
        expect(await child.exited).toBe(0);
      }
    });
  }
});
