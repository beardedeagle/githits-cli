import { afterEach, describe, expect, it, mock, spyOn } from "bun:test";
import type {
  AgenticAskResponse,
  AgenticAskService,
} from "@githits/core-internal";
import type { McpProgressOperation } from "@githits/mcp/internal";
import { researchAction } from "./research.js";

const RESPONSE: AgenticAskResponse = { display_markdown: "Answer\n" };

function operation(events: string[]): McpProgressOperation {
  return {
    headers: { "X-GitHits-Progress-Id": "op", "X-GitHits-Relay-Id": "relay" },
    rejected: () => {},
    end: () => events.push("progress ended"),
  };
}

afterEach(() => {
  mock.restore();
});

describe("researchAction live progress", () => {
  it("drives the spinner from backend progress and ends it before printing", async () => {
    const events: string[] = [];
    let notify: ((message: string) => void) | undefined;
    const ask = mock(
      async (_request: unknown, options?: { progress?: unknown }) => {
        events.push(options?.progress ? "ask with progress" : "ask");
        notify?.("Reading sources.");
        return RESPONSE;
      },
    );
    spyOn(process.stdout, "write").mockImplementation(() => {
      events.push("answer");
      return true;
    });

    await researchAction(
      "npm:example",
      "How?",
      {},
      {
        agenticAskService: { ask: ask as unknown as AgenticAskService["ask"] },
        hasValidToken: true,
        mcpUrl: "https://mcp.githits.com",
        createSpinner: () => ({
          active: true,
          stop: () => events.push("spinner stopped"),
          update: (label) => events.push(`label ${label}`),
        }),
        progress: {
          begin: async (onUpdate) => {
            notify = (message) => onUpdate({ progress: 1, message });
            return operation(events);
          },
        },
      },
    );

    expect(events).toEqual([
      "ask with progress",
      "label Reading sources...",
      "progress ended",
      "spinner stopped",
      "answer",
    ]);
  });

  it("does not start progress for JSON output", async () => {
    const begin = mock(async () => undefined);
    spyOn(console, "log").mockImplementation(() => undefined);

    await researchAction(
      "npm:example",
      "How?",
      { json: true },
      {
        agenticAskService: {
          ask: mock(
            async () => RESPONSE,
          ) as unknown as AgenticAskService["ask"],
        },
        hasValidToken: true,
        mcpUrl: "https://mcp.githits.com",
        progress: { begin },
      },
    );

    expect(begin).not.toHaveBeenCalled();
  });
});
