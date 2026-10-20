import { afterEach, describe, expect, it, mock } from "bun:test";
import {
  type McpProgressUpdate,
  type RelayAuth,
  RelayReceiver,
  type RelaySocket,
} from "./relay-receiver.js";

// The harness's first generated ID becomes the locally chosen relay ID.
const RELAY_ID = "00000000-0000-4000-8000-000000000000";

class FakeSocket implements RelaySocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  closed = false;

  constructor(readonly url: string) {}

  open(): void {
    this.onopen?.();
  }

  emit(event: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify({ version: 1, ...event }) });
  }

  drop(): void {
    this.onclose?.();
  }

  close(): void {
    this.closed = true;
  }
}

/** A relay mint response; by default it echoes the requested relay ID. */
type SetupResponse = Response | ((relayId: string) => Response);

interface Harness {
  receiver: RelayReceiver;
  sockets: FakeSocket[];
  setupCalls: { path: string; headers: Headers; body: string }[];
  responses: SetupResponse[];
  clock: { now: number };
}

const receivers: RelayReceiver[] = [];

afterEach(() => {
  for (const receiver of receivers.splice(0)) receiver.close();
});

function access(seconds = 900, url = "wss://relay.test/client"): SetupResponse {
  return (relayId) =>
    Response.json({
      relay_id: relayId,
      expires_at: Math.floor(Date.now() / 1000) + seconds,
      connection_url: url,
    });
}

function fakeFetch(
  responses: SetupResponse[],
  setupCalls: Harness["setupCalls"] = [],
): typeof fetch {
  return (async (url: string | URL | Request, init?: RequestInit) => {
    const body = String(init?.body ?? "");
    setupCalls.push({
      path: new URL(String(url)).pathname,
      headers: new Headers(init?.headers),
      body,
    });
    const next = responses.shift();
    if (!next) throw new TypeError("network down");
    return typeof next === "function" ? next(JSON.parse(body).relay_id) : next;
  }) as unknown as typeof fetch;
}

function harness(
  options: {
    auth?: RelayAuth;
    responses?: SetupResponse[];
    autoOpen?: boolean;
    idleCloseMs?: number;
    minRenewDelayMs?: number;
  } = {},
): Harness {
  const sockets: FakeSocket[] = [];
  const setupCalls: Harness["setupCalls"] = [];
  const responses = options.responses ?? [access()];
  const clock = { now: Date.now() };
  let ids = 0;
  const receiver = new RelayReceiver({
    apiUrl: "https://api.githits.test/",
    auth: options.auth ?? {
      kind: "caller",
      getToken: async () => "gh-proj-token",
    },
    fetchFn: fakeFetch(responses, setupCalls),
    createSocket: (url) => {
      const socket = new FakeSocket(url);
      sockets.push(socket);
      if (options.autoOpen !== false) queueMicrotask(() => socket.open());
      return socket;
    },
    idleCloseMs: options.idleCloseMs ?? 60_000,
    reconnectBaseMs: 5,
    minRenewDelayMs: options.minRenewDelayMs ?? 60_000,
    now: () => clock.now,
    createId: () => `00000000-0000-4000-8000-00000000000${ids++}`,
  });
  receivers.push(receiver);
  return { receiver, sockets, setupCalls, responses, clock };
}

function collector(): {
  notify: (update: McpProgressUpdate) => void;
  updates: McpProgressUpdate[];
} {
  const updates: McpProgressUpdate[] = [];
  return { notify: (update) => updates.push(update), updates };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
/** Lets background minting and the socket open complete. */
const settle = () => sleep(10);

describe("RelayReceiver", () => {
  it("returns correlation headers immediately and connects in the background", async () => {
    const { receiver, sockets, setupCalls } = harness();
    const operation = await receiver.begin(() => {});
    expect(operation?.headers).toEqual({
      "X-GitHits-Progress-Id": "00000000-0000-4000-8000-000000000001",
      "X-GitHits-Relay-Id": RELAY_ID,
    });
    await settle();
    expect(setupCalls).toHaveLength(1);
    expect(setupCalls[0]?.path).toBe("/progress/relays/renew");
    expect(JSON.parse(setupCalls[0]?.body ?? "{}")).toEqual({
      relay_id: RELAY_ID,
    });
    expect(setupCalls[0]?.headers.get("Authorization")).toBe(
      "Bearer gh-proj-token",
    );
    expect(sockets).toHaveLength(1);
  });

  it("never delays a call while the relay is minted", async () => {
    let releaseMint!: () => void;
    const mintBlocked = new Promise<void>((resolve) => {
      releaseMint = resolve;
    });
    const receiver = new RelayReceiver({
      apiUrl: "https://api.githits.test",
      auth: { kind: "caller", getToken: async () => "token" },
      fetchFn: (async (_url: string, init?: RequestInit) => {
        await mintBlocked;
        return Response.json({
          relay_id: JSON.parse(String(init?.body)).relay_id,
          expires_at: Math.floor(Date.now() / 1000) + 900,
          connection_url: "wss://relay.test/client",
        });
      }) as unknown as typeof fetch,
      createSocket: (url) => {
        const socket = new FakeSocket(url);
        queueMicrotask(() => socket.open());
        return socket;
      },
    });
    receivers.push(receiver);
    const started = Date.now();
    const operation = await receiver.begin(() => {});
    expect(Date.now() - started).toBeLessThan(50);
    expect(operation?.headers["X-GitHits-Relay-Id"]).toBeTruthy();
    releaseMint();
  });

  it("routes events to the matching call once the socket joins", async () => {
    const { receiver, sockets } = harness();
    const first = collector();
    const second = collector();
    const a = await receiver.begin(first.notify);
    const b = await receiver.begin(second.notify);
    await settle();
    expect(sockets).toHaveLength(1);
    const socket = sockets[0] as FakeSocket;
    socket.emit({
      operation_id: a?.headers["X-GitHits-Progress-Id"],
      sequence: 1,
      message: "Searching for sources.",
    });
    socket.emit({
      operation_id: b?.headers["X-GitHits-Progress-Id"]?.toUpperCase(),
      sequence: 2,
      message: "Selecting relevant sources.",
    });
    socket.emit({ operation_id: "unknown", sequence: 3, message: "x" });
    expect(first.updates).toEqual([
      { progress: 1, message: "Searching for sources." },
    ]);
    expect(second.updates).toEqual([
      { progress: 2, message: "Selecting relevant sources." },
    ]);
  });

  it("drops duplicate, stale and malformed events and stops after end", async () => {
    const { receiver, sockets } = harness();
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    await settle();
    const socket = sockets[0] as FakeSocket;
    const operation_id = operation?.headers["X-GitHits-Progress-Id"];
    socket.emit({ operation_id, sequence: 3, message: "Three" });
    socket.emit({ operation_id, sequence: 3, message: "Duplicate" });
    socket.emit({ operation_id, sequence: 2, message: "Stale" });
    socket.onmessage?.({ data: "not json" });
    socket.emit({ operation_id, sequence: 0, message: "Zero" });
    socket.onmessage?.({
      data: JSON.stringify({
        version: 2,
        operation_id,
        sequence: 9,
        message: "v2",
      }),
    });
    operation?.end();
    socket.emit({ operation_id, sequence: 4, message: "After end" });
    expect(updates).toEqual([{ progress: 3, message: "Three" }]);
  });

  it("decodes binary frames and caps message length", async () => {
    const { receiver, sockets } = harness();
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    await settle();
    const payload = JSON.stringify({
      version: 1,
      operation_id: operation?.headers["X-GitHits-Progress-Id"],
      sequence: 1,
      message: "x".repeat(500),
    });
    sockets[0]?.onmessage?.({ data: new TextEncoder().encode(payload) });
    expect(updates[0]?.message).toHaveLength(200);
  });

  it("sends service credentials on setup and on each call", async () => {
    const { receiver, setupCalls } = harness({
      auth: {
        kind: "service",
        serviceId: "example-service",
        key: "k".repeat(48),
      },
    });
    const operation = await receiver.begin(() => {});
    await settle();
    expect(setupCalls[0]?.headers.get("X-GitHits-Relay-Service")).toBe(
      "example-service",
    );
    expect(setupCalls[0]?.headers.has("Authorization")).toBe(false);
    expect(operation?.headers["X-GitHits-Relay-Service"]).toBe(
      "example-service",
    );
    expect(operation?.headers["X-GitHits-Relay-Key"]).toBe("k".repeat(48));
  });

  it.each([
    ["unavailable", new Response(null, { status: 503 }), 5 * 60_000],
    [
      "rate limited",
      new Response(null, { status: 429, headers: { "Retry-After": "7" } }),
      7_000,
    ],
    [
      "mismatched relay",
      Response.json({
        relay_id: "11111111-1111-4111-8111-111111111111",
        expires_at: Math.floor(Date.now() / 1000) + 900,
        connection_url: "wss://relay.test/client",
      }),
      5 * 60_000,
    ],
  ])(
    "omits progress after a %s mint until the backoff ends",
    async (_name, failure, backoff) => {
      const { receiver, setupCalls, responses, clock } = harness({
        responses: [failure],
      });
      // The first call already carries headers; the failure is learned later.
      expect(await receiver.begin(() => {})).toBeDefined();
      await settle();
      expect(await receiver.begin(() => {})).toBeUndefined();
      expect(setupCalls).toHaveLength(1);
      responses.push(access());
      clock.now += backoff + 1;
      expect(await receiver.begin(() => {})).toBeDefined();
      await settle();
      expect(setupCalls).toHaveLength(2);
    },
  );

  it("backs off without minting when the caller has no token", async () => {
    const { receiver, setupCalls } = harness({
      auth: { kind: "caller", getToken: async () => undefined },
    });
    await receiver.begin(() => {});
    await settle();
    expect(setupCalls).toHaveLength(0);
    expect(await receiver.begin(() => {})).toBeUndefined();
  });

  it("delivers events once a slow socket finally opens", async () => {
    const { receiver, sockets } = harness({ autoOpen: false });
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    await settle();
    const socket = sockets[0] as FakeSocket;
    socket.open();
    socket.emit({
      operation_id: operation?.headers["X-GitHits-Progress-Id"],
      sequence: 4,
      message: "Late but delivered",
    });
    expect(updates).toEqual([{ progress: 4, message: "Late but delivered" }]);
  });

  it("backs off when the socket cannot open", async () => {
    const { receiver, sockets, setupCalls } = harness({ autoOpen: false });
    await receiver.begin(() => {});
    await settle();
    sockets[0]?.drop();
    expect(await receiver.begin(() => {})).toBeUndefined();
    expect(setupCalls).toHaveLength(1);
  });

  it("reconnects with the same relay after a drop mid-call", async () => {
    const { receiver, sockets, setupCalls, responses } = harness();
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    await settle();
    const operation_id = operation?.headers["X-GitHits-Progress-Id"];
    responses.push(access(900, "wss://relay.test/renewed"));
    sockets[0]?.drop();
    await sleep(40);
    expect(setupCalls).toHaveLength(2);
    expect(JSON.parse(setupCalls[1]?.body ?? "{}")).toEqual({
      relay_id: RELAY_ID,
    });
    expect(sockets).toHaveLength(2);
    sockets[1]?.emit({ operation_id, sequence: 4, message: "Resumed" });
    expect(updates).toEqual([{ progress: 4, message: "Resumed" }]);
  });

  it("renews before expiry and swaps sockets only after the new one opens", async () => {
    const { receiver, sockets, setupCalls, responses } = harness({
      minRenewDelayMs: 10,
      responses: [access(30)],
    });
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    const operation_id = operation?.headers["X-GitHits-Progress-Id"];
    responses.push(access(900, "wss://relay.test/renewed"));
    await sleep(60);
    expect(setupCalls).toHaveLength(2);
    expect(sockets).toHaveLength(2);
    expect(sockets[0]?.closed).toBe(true);
    sockets[1]?.emit({ operation_id, sequence: 1, message: "After renewal" });
    expect(updates).toEqual([{ progress: 1, message: "After renewal" }]);
  });

  it("keeps the working socket when a replacement fails to open", async () => {
    const sockets: FakeSocket[] = [];
    const responses = [access(30), access(900, "wss://relay.test/broken")];
    const receiver = new RelayReceiver({
      apiUrl: "https://api.githits.test",
      auth: { kind: "caller", getToken: async () => "token" },
      fetchFn: fakeFetch(responses),
      createSocket: (url) => {
        const socket = new FakeSocket(url);
        sockets.push(socket);
        queueMicrotask(() =>
          sockets.length === 1 ? socket.open() : socket.drop(),
        );
        return socket;
      },
      minRenewDelayMs: 10,
      reconnectBaseMs: 60_000,
    });
    receivers.push(receiver);
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    await sleep(60);
    expect(sockets).toHaveLength(2);
    expect(sockets[0]?.closed).toBe(false);
    sockets[0]?.emit({
      operation_id: operation?.headers["X-GitHits-Progress-Id"],
      sequence: 1,
      message: "Still flowing",
    });
    expect(updates).toHaveLength(1);
  });

  it("stops offering progress after a backend rejection", async () => {
    const { receiver, clock } = harness();
    const operation = await receiver.begin(() => {});
    operation?.rejected("unavailable");
    operation?.end();
    expect(await receiver.begin(() => {})).toBeUndefined();
    clock.now += 5 * 60_000 + 1;
    expect(await receiver.begin(() => {})).toBeDefined();
  });

  it("closes an idle socket and reconnects on demand", async () => {
    const { receiver, sockets, setupCalls, responses } = harness({
      idleCloseMs: 10,
    });
    const operation = await receiver.begin(() => {});
    await settle();
    operation?.end();
    await sleep(30);
    expect(sockets[0]?.closed).toBe(true);
    responses.push(access());
    expect(await receiver.begin(() => {})).toBeDefined();
    await settle();
    expect(setupCalls).toHaveLength(2);
    expect(sockets).toHaveLength(2);
  });

  it("close() shuts the socket and disables progress", async () => {
    const { receiver, sockets } = harness();
    await receiver.begin(() => {});
    await settle();
    receiver.close();
    expect(sockets[0]?.closed).toBe(true);
    expect(await receiver.begin(() => {})).toBeUndefined();
  });

  it("never lets a throwing notifier affect delivery", async () => {
    const { receiver, sockets } = harness();
    const operation = await receiver.begin(
      mock(() => {
        throw new Error("client gone");
      }),
    );
    await settle();
    expect(() =>
      sockets[0]?.emit({
        operation_id: operation?.headers["X-GitHits-Progress-Id"],
        sequence: 1,
        message: "x",
      }),
    ).not.toThrow();
  });
});

describe("RelayReceiver stages", () => {
  it("passes a safe backend stage through to updates", async () => {
    const { receiver, sockets } = harness();
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    await settle();
    const operation_id = operation?.headers["X-GitHits-Progress-Id"];
    sockets[0]?.emit({
      operation_id,
      sequence: 1,
      message: "Reading sources.",
      stage: "reading",
    });
    sockets[0]?.emit({
      operation_id,
      sequence: 2,
      message: "Odd.",
      stage: "Not A Stage!",
    });
    expect(updates).toEqual([
      { progress: 1, message: "Reading sources.", stage: "reading" },
      { progress: 2, message: "Odd." },
    ]);
  });
});

describe("RelayReceiver warm-up", () => {
  it("connects before the first call and reuses the socket", async () => {
    const { receiver, sockets, setupCalls } = harness();
    receiver.warm();
    await settle();
    expect(setupCalls).toHaveLength(1);
    expect(sockets).toHaveLength(1);
    const { notify, updates } = collector();
    const operation = await receiver.begin(notify);
    sockets[0]?.emit({
      operation_id: operation?.headers["X-GitHits-Progress-Id"],
      sequence: 1,
      message: "Starting…",
    });
    expect(setupCalls).toHaveLength(1);
    expect(updates).toEqual([{ progress: 1, message: "Starting…" }]);
  });

  it("does nothing once closed", async () => {
    const { receiver, setupCalls } = harness();
    receiver.close();
    receiver.warm();
    await settle();
    expect(setupCalls).toHaveLength(0);
  });
});
