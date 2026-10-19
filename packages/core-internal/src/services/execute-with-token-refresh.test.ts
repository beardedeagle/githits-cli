import { describe, expect, it, mock } from "bun:test";
import { executeWithTokenRefresh } from "./execute-with-token-refresh.js";
import {
  AuthenticationError,
  TermsAcceptanceRequiredError,
} from "./githits-service.js";

describe("executeWithTokenRefresh", () => {
  it("never calls the refresh hook for an opaque ghi-* token", async () => {
    const forceRefresh = mock(() => Promise.resolve("unexpected-token"));
    const executeWithToken = mock(() =>
      Promise.reject(new TermsAcceptanceRequiredError()),
    );

    await expect(
      executeWithTokenRefresh({
        getToken: mock(() => Promise.resolve("ghi-static-token")),
        forceRefresh,
        executeWithToken,
        shouldRefresh: () => true,
      }),
    ).rejects.toBeInstanceOf(TermsAcceptanceRequiredError);

    expect(forceRefresh).not.toHaveBeenCalled();
    expect(executeWithToken).toHaveBeenCalledTimes(1);
  });
  it("rejects with an already-aborted caller reason before reading a token", async () => {
    const controller = new AbortController();
    const reason = new Error("already cancelled");
    controller.abort(reason);
    const getToken = mock(() => Promise.resolve("token"));
    const executeWithToken = mock(() => Promise.resolve("unexpected"));

    await expect(
      executeWithTokenRefresh({
        getToken,
        forceRefresh: mock(() => Promise.resolve("refreshed")),
        executeWithToken,
        shouldRefresh: () => true,
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(getToken).not.toHaveBeenCalled();
    expect(executeWithToken).not.toHaveBeenCalled();
  });

  it("does not execute when the caller aborts while the token is read", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled during token lookup");
    const executeWithToken = mock(() => Promise.resolve("unexpected"));

    await expect(
      executeWithTokenRefresh({
        getToken: async () => {
          controller.abort(reason);
          return "token";
        },
        forceRefresh: mock(() => Promise.resolve("refreshed")),
        executeWithToken,
        shouldRefresh: () => true,
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(executeWithToken).not.toHaveBeenCalled();
  });

  it("does not refresh when the caller aborted before a refreshable failure", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled before failure");
    const forceRefresh = mock(() => Promise.resolve("refreshed"));

    await expect(
      executeWithTokenRefresh({
        getToken: () => Promise.resolve("token"),
        forceRefresh,
        executeWithToken: async () => {
          controller.abort(reason);
          throw new AuthenticationError();
        },
        shouldRefresh: () => true,
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(forceRefresh).not.toHaveBeenCalled();
  });

  it("does not retry when the caller aborts during refresh", async () => {
    const controller = new AbortController();
    const reason = new Error("cancelled during refresh");
    const executeWithToken = mock(() =>
      Promise.reject(new AuthenticationError()),
    );

    await expect(
      executeWithTokenRefresh({
        getToken: () => Promise.resolve("token"),
        forceRefresh: async () => {
          controller.abort(reason);
          return "refreshed";
        },
        executeWithToken,
        shouldRefresh: () => true,
        signal: controller.signal,
      }),
    ).rejects.toBe(reason);
    expect(executeWithToken).toHaveBeenCalledTimes(1);
  });

  it("retries once after refresh while the caller signal stays active", async () => {
    const controller = new AbortController();
    const executeWithToken = mock(async (token: string) => {
      if (token === "token") throw new AuthenticationError();
      return `ok:${token}`;
    });

    await expect(
      executeWithTokenRefresh({
        getToken: () => Promise.resolve("token"),
        forceRefresh: () => Promise.resolve("refreshed"),
        executeWithToken,
        shouldRefresh: () => true,
        signal: controller.signal,
      }),
    ).resolves.toBe("ok:refreshed");
    expect(executeWithToken).toHaveBeenCalledTimes(2);
  });
});
