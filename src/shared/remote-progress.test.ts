import { describe, expect, it, mock } from "bun:test";
import type { McpProgressHook, McpProgressUpdate } from "@githits/mcp/internal";
import {
  beginSpinnerProgress,
  createCommandProgress,
  openingResearchLabel,
  toSpinnerLabel,
} from "./remote-progress.js";
import type { Spinner } from "./spinner.js";

function spinner(active = true): Spinner & { labels: string[] } {
  const labels: string[] = [];
  return {
    active,
    labels,
    stop: () => {},
    update: (label) => labels.push(label),
  };
}

type FakeHook = McpProgressHook & {
  notify?: (update: McpProgressUpdate) => void;
};

function hook(): FakeHook {
  const fake: FakeHook = {
    begin: async (notify) => {
      fake.notify = notify;
      return {
        headers: {
          "X-GitHits-Progress-Id": "op",
          "X-GitHits-Relay-Id": "relay",
        },
        rejected: () => {},
        end: () => {},
      };
    },
  };
  return fake;
}

describe("toSpinnerLabel", () => {
  it.each([
    ["Searching for sources.", "Searching for sources..."],
    ["Reading sources...", "Reading sources..."],
    ["Reading sources…", "Reading sources..."],
    ["  Writing the answer…  ", "Writing the answer..."],
    ["Ready", "Ready"],
    ["", "Working..."],
  ])("formats %p as %p", (message, label) => {
    expect(toSpinnerLabel(message)).toBe(label);
  });
});

describe("beginSpinnerProgress", () => {
  it("updates the spinner label and stage from live progress", async () => {
    const progressHook = hook();
    const stages: (string | undefined)[] = [];
    const view = { ...spinner(), setStage: (s?: string) => stages.push(s) };
    const operation = await beginSpinnerProgress(view, progressHook);
    expect(operation?.headers["X-GitHits-Progress-Id"]).toBe("op");
    progressHook.notify?.({
      progress: 2,
      message: "Searching for sources.",
      stage: "searching",
    });
    expect(view.labels).toEqual(["Searching for sources..."]);
    expect(stages).toEqual(["searching"]);
  });

  it("ignores the backend's generic start stage", async () => {
    const progressHook = hook();
    const view = spinner();
    await beginSpinnerProgress(view, progressHook);
    progressHook.notify?.({
      progress: 1,
      message: "Starting…",
      stage: "started",
    });
    progressHook.notify?.({
      progress: 2,
      message: "Ranking 3 results…",
      stage: "ranking",
    });
    expect(view.labels).toEqual(["Ranking 3 results..."]);
  });

  it("skips progress for inactive spinners and missing hooks", async () => {
    const progressHook = hook();
    const begin = mock(progressHook.begin);
    progressHook.begin = begin;
    expect(
      await beginSpinnerProgress(spinner(false), progressHook),
    ).toBeUndefined();
    expect(await beginSpinnerProgress(spinner(), undefined)).toBeUndefined();
    expect(begin).not.toHaveBeenCalled();
  });

  it("treats a failing hook as no progress", async () => {
    const failing: McpProgressHook = {
      begin: async () => {
        throw new Error("offline");
      },
    };
    expect(await beginSpinnerProgress(spinner(), failing)).toBeUndefined();
  });
});

describe("command progress setup", () => {
  it("opens research on the target being resolved", () => {
    expect(openingResearchLabel("pypi:httpx")).toBe("Resolving pypi:httpx...");
    expect(openingResearchLabel(undefined)).toBe("Researching...");
    expect(openingResearchLabel("not a target!")).toBe("Researching...");
  });

  it("creates no receiver outside an interactive terminal", () => {
    const deps = {
      apiUrl: "https://api.githits.test",
      tokenProvider: {
        getToken: mock(async () => "token"),
        forceRefresh: async () => undefined,
      },
    };
    expect(createCommandProgress(deps, false)).toBeUndefined();
    expect(deps.tokenProvider.getToken).not.toHaveBeenCalled();
  });
});
