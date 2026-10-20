import { describe, expect, it, mock } from "bun:test";
import { AgenticAskServiceImpl } from "./agentic-ask-service.js";
import displayContract from "./fixtures/ask-display-contract.json";
import { GitHitsServiceImpl } from "./githits-service.js";
import type { ProgressRequest } from "./progress-request.js";
import { createMockTokenProvider } from "./test-helpers.js";

const PROGRESS_HEADERS = {
  "X-GitHits-Progress-Id": "8f9a1c2e-0d4b-4e5f-9a6b-7c8d9e0f1a2b",
  "X-GitHits-Relay-Id": "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b",
};

interface Captured {
  headers: Headers;
  body: string;
}

function recordingFetch(responses: Response[]): {
  fetchFn: typeof fetch;
  calls: Captured[];
} {
  const calls: Captured[] = [];
  const fetchFn = mock(
    async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push({
        headers: new Headers(init?.headers),
        body: String(init?.body ?? ""),
      });
      const next = responses.shift();
      if (!next) throw new Error("unexpected request");
      return next;
    },
  );
  return { fetchFn: fetchFn as unknown as typeof fetch, calls };
}

function progressRequest(): ProgressRequest & {
  rejected: ReturnType<typeof mock>;
} {
  return { headers: PROGRESS_HEADERS, rejected: mock(() => {}) };
}

function rejection(status: number, code: string): Response {
  return new Response(JSON.stringify({ detail: "Progress request rejected" }), {
    status,
    headers: { "X-GitHits-Progress-Error": code },
  });
}

function askService(fetchFn: typeof fetch): AgenticAskServiceImpl {
  return new AgenticAskServiceImpl(
    "https://api.githits.test",
    createMockTokenProvider(),
    fetchFn,
    {
      clientHeaders: () => ({
        "x-githits-session-id": "session-id",
        // A colliding header must never override auth.
        Authorization: "Bearer client-header",
      }),
    },
  );
}

function searchService(fetchFn: typeof fetch): GitHitsServiceImpl {
  return new GitHitsServiceImpl(
    "https://api.githits.test",
    "token",
    fetchFn,
    undefined,
    {
      clientHeaders: () => ({ "x-githits-session-id": "session-id" }),
    },
  );
}

const question = {
  target: "pypi:httpx",
  question: "default timeout?",
} as const;

describe("progress request headers", () => {
  it("adds correlation headers to /ask without touching session or auth", async () => {
    const { fetchFn, calls } = recordingFetch([
      Response.json(displayContract.cli),
    ]);
    const progress = progressRequest();
    await askService(fetchFn).ask(question, { progress });
    expect(calls).toHaveLength(1);
    const headers = calls[0]?.headers;
    expect(headers?.get("X-GitHits-Progress-Id")).toBe(
      PROGRESS_HEADERS["X-GitHits-Progress-Id"],
    );
    expect(headers?.get("X-GitHits-Relay-Id")).toBe(
      PROGRESS_HEADERS["X-GitHits-Relay-Id"],
    );
    expect(headers?.get("x-githits-session-id")).toBe("session-id");
    expect(headers?.get("Authorization")).not.toBe("Bearer client-header");
    expect(progress.rejected).not.toHaveBeenCalled();
  });

  it("adds correlation headers to /search", async () => {
    const { fetchFn, calls } = recordingFetch([new Response("# Example")]);
    const progress = progressRequest();
    const result = await searchService(fetchFn).search(
      { query: "timeouts", sourceFormat: "mcp" },
      { progress },
    );
    expect(result).toBe("# Example");
    expect(calls[0]?.headers.get("X-GitHits-Progress-Id")).toBe(
      PROGRESS_HEADERS["X-GitHits-Progress-Id"],
    );
    expect(calls[0]?.headers.get("x-githits-session-id")).toBe("session-id");
  });

  it("omits progress headers when no progress is requested", async () => {
    const { fetchFn, calls } = recordingFetch([
      Response.json(displayContract.cli),
    ]);
    await askService(fetchFn).ask(question);
    expect(calls[0]?.headers.has("X-GitHits-Progress-Id")).toBe(false);
  });
});

describe("pre-execution progress rejection", () => {
  it.each([
    [400, "invalid_progress_request"],
    [401, "service_auth_required"],
    [503, "unavailable"],
  ])("/ask resends once without progress after %i %s", async (status, code) => {
    const { fetchFn, calls } = recordingFetch([
      rejection(status, code),
      Response.json(displayContract.cli),
    ]);
    const progress = progressRequest();
    const response = await askService(fetchFn).ask(question, { progress });
    expect(response.display_markdown).toBe(
      displayContract.cli.display_markdown,
    );
    expect(calls).toHaveLength(2);
    expect(calls[1]?.headers.has("X-GitHits-Progress-Id")).toBe(false);
    expect(calls[1]?.headers.has("X-GitHits-Relay-Id")).toBe(false);
    expect(calls[1]?.body).toBe(calls[0]?.body);
    expect(progress.rejected).toHaveBeenCalledWith(code);
  });

  it("/search resends once without progress", async () => {
    const { fetchFn, calls } = recordingFetch([
      rejection(503, "unavailable"),
      new Response("# Example"),
    ]);
    const progress = progressRequest();
    const result = await searchService(fetchFn).search(
      { query: "timeouts", sourceFormat: "mcp" },
      { progress },
    );
    expect(result).toBe("# Example");
    expect(calls).toHaveLength(2);
    expect(calls[1]?.headers.has("X-GitHits-Progress-Id")).toBe(false);
    expect(calls[1]?.body).toBe(calls[0]?.body);
    expect(progress.rejected).toHaveBeenCalledWith("unavailable");
  });

  it("does not resend ordinary errors that lack the progress marker", async () => {
    const { fetchFn, calls } = recordingFetch([
      new Response("busy", { status: 503 }),
    ]);
    const progress = progressRequest();
    await expect(
      searchService(fetchFn).search(
        { query: "q", sourceFormat: "mcp" },
        { progress },
      ),
    ).rejects.toThrow();
    expect(calls).toHaveLength(1);
    expect(progress.rejected).not.toHaveBeenCalled();
  });

  it("does not resend a second time when the retry also fails", async () => {
    const { fetchFn, calls } = recordingFetch([
      rejection(503, "unavailable"),
      rejection(503, "unavailable"),
    ]);
    await expect(
      searchService(fetchFn).search(
        { query: "q", sourceFormat: "mcp" },
        { progress: progressRequest() },
      ),
    ).rejects.toThrow();
    expect(calls).toHaveLength(2);
  });
});
