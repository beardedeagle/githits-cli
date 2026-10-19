import { describe, expect, it, mock, spyOn } from "bun:test";
import type { GrepParams, GrepResult } from "@githits/core-internal";
import { Command } from "commander";
import { registerGrepCommand } from "../commands/grep.js";
import {
  createMockGrepService,
  defaultGrepResult,
} from "../services/test-helpers.js";
import { createParityMcpTool } from "./parity-test-helpers.js";

describe("unified grep CLI/MCP parity", () => {
  it("shares qualified empty copy and selective recovery while preserving JSON", async () => {
    const result: GrepResult = {
      ...defaultGrepResult,
      traversal: "NON_RESUMABLE_PARTIAL",
      unavailableTargets: [
        {
          inputIndex: 0,
          target: "npm:pending",
          reason: "repository_indexing",
          retryable: true,
          progressRef: null,
          suggestedSiteTargets: null,
        },
        {
          inputIndex: 1,
          target: "npm:terminal",
          reason: "no_grep_scopes",
          retryable: false,
          progressRef: null,
          suggestedSiteTargets: null,
        },
      ],
    };
    const before = structuredClone(result);
    const grepService = createMockGrepService({
      grep: mock(() => Promise.resolve(result)),
    });
    const write = spyOn(process.stdout, "write").mockImplementation(() => true);
    try {
      const program = new Command("githits");
      registerGrepCommand(program, async () => ({
        grepService,
        hasValidToken: true,
        mcpUrl: "https://example.test",
        createSpinner: () => ({ stop: () => {} }),
      }));
      await program.parseAsync(
        ["grep", "router", "npm:pending", "npm:terminal"],
        { from: "user" },
      );
      const cli = write.mock.calls.map(([chunk]) => String(chunk)).join("");
      const tool = createParityMcpTool("grep", { grepService });
      const args = {
        targets: [{ target: "npm:pending" }, { target: "npm:terminal" }],
        pattern: "router",
      };
      const mcp = await tool.handler(args);
      expect(mcp.isError).toBeUndefined();
      const mcpText = String(mcp.content[0]?.text);
      expect(cli).toContain("None of the requested content could be searched.");
      expect(cli).toContain(
        "Repeat the same pattern and options for:\n    npm:pending",
      );
      expect(cli).toContain(
        "Omit --cursor; add --wait 30000 to wait up to 30s for preparation.",
      );
      expect(mcpText).toContain(
        "Omit cursor; add wait_timeout_ms=30000 to wait up to 30s for preparation.",
      );
      expect(
        cli
          .replace("--wait 30000", "wait_timeout_ms=30000")
          .replace("Omit --cursor", "Omit cursor")
          .trim(),
      ).toBe(mcpText);
      const json = await tool.handler({ ...args, format: "json" });
      expect(JSON.parse(String(json.content[0]?.text))).toEqual(before);
      expect(result).toEqual(before);
    } finally {
      write.mockRestore();
    }
  });

  it("sends equivalent mixed targets and controls and returns the same JSON", async () => {
    const grep = mock((_params: GrepParams) =>
      Promise.resolve(defaultGrepResult),
    );
    const grepService = createMockGrepService({ grep });
    const log = spyOn(console, "log").mockImplementation(() => {});
    try {
      const program = new Command("githits");
      registerGrepCommand(program, async () => ({
        grepService,
        hasValidToken: true,
        mcpUrl: "https://example.test",
        createSpinner: () => ({ stop: () => {} }),
      }));
      await program.parseAsync(
        [
          "grep",
          "-F",
          "-i",
          "-C",
          "2",
          "-A",
          "1",
          "-B",
          "0",
          "router",
          "npm:express",
          "site:expressjs.com",
          "--corpus",
          "documentation",
          "--path",
          "History.md",
          "--glob",
          "docs/**",
          "--limit",
          "7",
          "--cursor",
          "page-two",
          "--wait",
          "20",
          "--json",
        ],
        { from: "user" },
      );
      const cliParams = grep.mock.calls[0]?.[0];
      const cliJson = String(log.mock.calls[0]?.[0]);

      const mcp = await createParityMcpTool("grep", { grepService }).handler({
        targets: [
          {
            target: "npm:express",
            corpus: "documentation",
            path_selectors: [
              { kind: "exact", value: "History.md" },
              { kind: "glob", value: "docs/**" },
            ],
          },
          { target: "site:expressjs.com" },
        ],
        pattern: "router",
        pattern_type: "literal",
        ignore_case: true,
        context_lines_before: 0,
        context_lines_after: 1,
        max_matches: 7,
        cursor: "page-two",
        wait_timeout_ms: 20,
        format: "json",
      });

      expect(mcp.isError).toBeUndefined();
      expect(grep).toHaveBeenCalledTimes(2);
      expect(grep.mock.calls[1]?.[0]).toEqual(cliParams);
      expect(mcp.content[0]?.text).toBe(cliJson);
    } finally {
      log.mockRestore();
    }
  });
});
