import { afterEach, describe, expect, it } from "bun:test";
import type { ProgressRequest } from "@githits/core-internal";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolResultSchema,
  ProgressNotificationSchema,
} from "@modelcontextprotocol/sdk/types.js";
import type { McpProgressAnimationOptions } from "../progress/progress-animator.js";
import type {
  McpProgressHook,
  McpProgressOperation,
  McpProgressUpdate,
} from "../progress/relay-receiver.js";
import type { McpToolServices } from "../tools/tool-services.js";
import { createDescriptorServices, createMcpServer } from "./server.js";

interface FakeHook extends McpProgressHook {
  begun: number;
  ended: number;
  notify?: (update: McpProgressUpdate) => void;
}

/** Emits two updates while the backend call is in flight. */
function fakeHook(available = true): FakeHook {
  const hook: FakeHook = {
    begun: 0,
    ended: 0,
    begin: async (notify): Promise<McpProgressOperation | undefined> => {
      hook.begun += 1;
      if (!available) return undefined;
      hook.notify = notify;
      return {
        headers: {
          "X-GitHits-Progress-Id": "op",
          "X-GitHits-Relay-Id": "relay",
        },
        rejected: () => {},
        end: () => {
          hook.ended += 1;
          hook.notify = undefined;
        },
      };
    },
  };
  return hook;
}

function services(hook: FakeHook, seen: (ProgressRequest | undefined)[]) {
  const backendCall = async (progress?: ProgressRequest) => {
    seen.push(progress);
    hook.notify?.({ progress: 1, message: "Searching for sources." });
    await new Promise((resolve) => setTimeout(resolve, 5));
    hook.notify?.({ progress: 2, message: "Preparing the answer." });
  };
  return {
    ...createDescriptorServices(),
    githitsService: {
      search: async (_params, options) => {
        await backendCall(options?.progress);
        return "# Example";
      },
    },
    agenticAskService: {
      ask: async (_request, options) => {
        await backendCall(options?.progress);
        return { display_markdown: "Answer" };
      },
    },
  } as McpToolServices;
}

const servers: McpServer[] = [];
afterEach(async () => {
  for (const server of servers.splice(0)) await server.close();
});

async function connect(
  progress: McpProgressHook | undefined,
  toolServices: McpToolServices,
  // Most tests assert exact live messages, so animation is off unless asked.
  progressAnimation: McpProgressAnimationOptions | boolean = false,
) {
  const server = createMcpServer({
    metadata: { name: "test", version: "0.0.0" },
    services: toolServices,
    progressAnimation,
    ...(progress ? { progress } : {}),
  });
  servers.push(server);
  const client = new Client({ name: "client", version: "0.0.0" });
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  await client.connect(clientTransport);
  return client;
}

const CALLS = [
  ["get_example", { query: "httpx timeout" }],
  ["research", { question: "default timeout?", target: "pypi:httpx" }],
] as const;

describe("MCP progress over a real transport", () => {
  it.each(CALLS)(
    "%s forwards progress before the final result",
    async (name, args) => {
      const hook = fakeHook();
      const seen: (ProgressRequest | undefined)[] = [];
      const client = await connect(hook, services(hook, seen));
      const updates: { progress: number; message?: string }[] = [];
      const result = await client.callTool(
        { name, arguments: args },
        CallToolResultSchema,
        {
          onprogress: (update) =>
            updates.push({
              progress: update.progress,
              message: update.message,
            }),
        },
      );
      expect(result.isError).toBeFalsy();
      expect(updates).toEqual([
        { progress: 1, message: "Searching for sources." },
        { progress: 2, message: "Preparing the answer." },
      ]);
      expect(seen[0]?.headers).toEqual({
        "X-GitHits-Progress-Id": "op",
        "X-GitHits-Relay-Id": "relay",
      });
      expect(hook.ended).toBe(1);
    },
  );

  it("supports progress token 0", async () => {
    const hook = fakeHook();
    const client = await connect(hook, services(hook, []));
    const tokens: unknown[] = [];
    client.setNotificationHandler(
      ProgressNotificationSchema,
      (notification) => {
        tokens.push(notification.params.progressToken);
      },
    );
    await client.request(
      {
        method: "tools/call",
        params: {
          name: "get_example",
          arguments: { query: "httpx timeout" },
          _meta: { progressToken: 0 },
        },
      },
      CallToolResultSchema,
    );
    expect(tokens).toEqual([0, 0]);
  });

  it("does not engage progress when the client sends no token", async () => {
    const hook = fakeHook();
    const seen: (ProgressRequest | undefined)[] = [];
    const client = await connect(hook, services(hook, seen));
    const result = await client.callTool({
      name: "get_example",
      arguments: { query: "httpx timeout" },
    });
    expect(result.isError).toBeFalsy();
    expect(hook.begun).toBe(0);
    expect(seen).toEqual([undefined]);
  });

  it("runs unchanged when progress is unavailable", async () => {
    const hook = fakeHook(false);
    const seen: (ProgressRequest | undefined)[] = [];
    const client = await connect(hook, services(hook, seen));
    const updates: unknown[] = [];
    const result = await client.callTool(
      { name: "research", arguments: { question: "q?", target: "pypi:httpx" } },
      CallToolResultSchema,
      { onprogress: (update) => updates.push(update) },
    );
    expect(result.isError).toBeFalsy();
    expect(hook.begun).toBe(1);
    expect(seen).toEqual([undefined]);
    expect(updates).toEqual([]);
  });

  it("ends progress when the backend call fails", async () => {
    const hook = fakeHook();
    const toolServices = {
      ...services(hook, []),
      githitsService: {
        search: async () => {
          throw new Error("Server error (500)");
        },
      },
    } as McpToolServices;
    const client = await connect(hook, toolServices);
    const result = await client.callTool(
      { name: "get_example", arguments: { query: "q" } },
      CallToolResultSchema,
      { onprogress: () => {} },
    );
    expect(result.isError).toBe(true);
    expect(hook.ended).toBe(1);
  });

  it("leaves servers without a hook unchanged", async () => {
    const seen: (ProgressRequest | undefined)[] = [];
    const client = await connect(undefined, services(fakeHook(), seen));
    const result = await client.callTool(
      { name: "get_example", arguments: { query: "q" } },
      CallToolResultSchema,
      { onprogress: () => {} },
    );
    expect(result.isError).toBeFalsy();
    expect(seen).toEqual([undefined]);
  });

  it("animates progress locally with the narrowing mark", async () => {
    const hook = fakeHook();
    const client = await connect(hook, services(hook, []), { intervalMs: 2 });
    const updates: { progress: number; message: string }[] = [];
    const result = await client.callTool(
      { name: "get_example", arguments: { query: "httpx timeout" } },
      CallToolResultSchema,
      {
        onprogress: (update) =>
          updates.push({
            progress: update.progress,
            message: update.message ?? "",
          }),
      },
    );
    expect(result.isError).toBeFalsy();
    expect(
      updates[0]?.message.endsWith(" Searching source code and docs…"),
    ).toBe(true);
    expect(
      updates.some((u) => u.message.endsWith(" Preparing the answer.")),
    ).toBe(true);
    expect(updates.every((u) => /^[\u2800-\u28ff]+ /u.test(u.message))).toBe(
      true,
    );
    expect(
      updates.every(
        (u, i) => i === 0 || u.progress > (updates[i - 1]?.progress ?? -1),
      ),
    ).toBe(true);
  });

  it("can animate without live progress", async () => {
    const seen: (ProgressRequest | undefined)[] = [];
    const client = await connect(undefined, services(fakeHook(), seen), {
      intervalMs: 2,
    });
    const updates: string[] = [];
    await client.callTool(
      { name: "research", arguments: { question: "q?", target: "pypi:httpx" } },
      CallToolResultSchema,
      { onprogress: (update) => updates.push(update.message ?? "") },
    );
    expect(updates.length).toBeGreaterThan(0);
    expect(updates.every((m) => m.endsWith(" Resolving pypi:httpx…"))).toBe(
      true,
    );
    expect(seen[0]?.headers).toEqual({});
  });
});
