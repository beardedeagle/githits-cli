import { describe, expect, it, mock } from "bun:test";
import {
  ListServiceImpl,
  type ServiceRequestOptions,
  type TokenProvider,
} from "@githits/core-internal";
import {
  createMockCodeNavigationService,
  createMockPackageIntelligenceService,
  createMockReadService,
} from "../services/test-helpers.js";
import { createCodeDiffTool } from "./code-diff.js";
import { createGrepTool } from "./grep.js";
import { createListTool } from "./list.js";
import { createPackageChangelogTool } from "./package-changelog.js";
import { createPackageDependenciesTool } from "./package-dependencies.js";
import { createPackageSummaryTool } from "./package-summary.js";
import { createPackageUpgradeReviewTool } from "./package-upgrade-review.js";
import { createPackageVulnerabilitiesTool } from "./package-vulnerabilities.js";
import { createReadTool } from "./read.js";
import { createResolveTargetTool } from "./resolve-target.js";
import type { ToolExecutionContext, ToolResult } from "./types.js";

type ServiceMethod = (
  params: unknown,
  options?: ServiceRequestOptions,
) => Promise<never>;

interface NetworkToolCase {
  name: string;
  /** Build the tool around one service method and invoke it once. */
  invoke: (
    method: ServiceMethod,
    context?: ToolExecutionContext,
  ) => Promise<ToolResult>;
}

const cases: NetworkToolCase[] = [
  {
    name: "list",
    invoke: (method, context) =>
      createListTool({ list: method }).handler(
        { target: "npm:express" },
        context,
      ),
  },
  {
    name: "read (documentation or selector read)",
    invoke: (method, context) =>
      createReadTool({
        readService: createMockReadService({ read: method }),
      }).handler({ target: "npm:express" }, context),
  },
  {
    name: "read (source file read)",
    invoke: (method, context) =>
      createReadTool({
        readService: createMockReadService({ read: method }),
      }).handler({ target: "npm:express", path: "index.js" }, context),
  },
  {
    name: "grep",
    invoke: (method, context) =>
      createGrepTool({ grep: method }).handler(
        { targets: [{ target: "npm:express" }], pattern: "router" },
        context,
      ),
  },
  {
    name: "resolve_target",
    invoke: (method, context) =>
      createResolveTargetTool({ resolveTarget: method }).handler(
        { name: "express" },
        context,
      ),
  },
  {
    name: "code_diff",
    invoke: (method, context) =>
      createCodeDiffTool(
        createMockCodeNavigationService({ codeDiff: method }),
      ).handler({ target: "npm:express", from: "4.0.0", to: "5.0.0" }, context),
  },
  {
    name: "pkg_info",
    invoke: (method, context) =>
      createPackageSummaryTool(
        createMockPackageIntelligenceService({ packageSummary: method }),
      ).handler({ target: "npm:express" }, context),
  },
  {
    name: "pkg_vulns",
    invoke: (method, context) =>
      createPackageVulnerabilitiesTool(
        createMockPackageIntelligenceService({
          packageVulnerabilities: method,
        }),
      ).handler({ target: "npm:express" }, context),
  },
  {
    name: "pkg_deps",
    invoke: (method, context) =>
      createPackageDependenciesTool(
        createMockPackageIntelligenceService({ packageDependencies: method }),
      ).handler({ target: "npm:express" }, context),
  },
  {
    name: "pkg_changelog",
    invoke: (method, context) =>
      createPackageChangelogTool(
        createMockPackageIntelligenceService({ packageChangelog: method }),
      ).handler({ target: "npm:express" }, context),
  },
  {
    name: "pkg_upgrade_review",
    invoke: (method, context) =>
      createPackageUpgradeReviewTool(
        createMockPackageIntelligenceService({ packageUpgradeReview: method }),
      ).handler(
        {
          registry: "npm",
          package_name: "express",
          current_version: "4.0.0",
          target_version: "5.0.0",
        },
        context,
      ),
  },
];

/** A service call that only settles when its forwarded signal aborts. */
function pendingServiceMethod(started: () => void) {
  return mock((_params: unknown, options?: ServiceRequestOptions) => {
    const signal = options?.signal;
    return new Promise<never>((_resolve, reject) => {
      if (!signal) {
        reject(new Error("service call received no caller signal"));
        return;
      }
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
      started();
    });
  });
}

describe("network-backed MCP tools forward caller cancellation", () => {
  describe.each(cases)("$name", ({ invoke }) => {
    it("aborts the pending service request when the caller aborts", async () => {
      const controller = new AbortController();
      const reason = new Error("caller cancelled");
      const method = pendingServiceMethod(() => controller.abort(reason));

      await expect(invoke(method, { signal: controller.signal })).rejects.toBe(
        reason,
      );
      expect(method).toHaveBeenCalledTimes(1);
      expect(method.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
    });

    it("keeps the single-argument service call when no signal is supplied", async () => {
      const method = mock(
        (..._args: [unknown, ServiceRequestOptions?]): Promise<never> =>
          Promise.reject(new Error("service unavailable")),
      );

      const result = await invoke(method, {});

      expect(result.isError).toBe(true);
      expect(method).toHaveBeenCalledTimes(1);
      expect(method.mock.calls[0]).toHaveLength(1);
    });

    it("maps service failures to tool errors while the caller is active", async () => {
      const controller = new AbortController();
      const method = mock(
        (_params: unknown, _options?: ServiceRequestOptions): Promise<never> =>
          Promise.reject(new Error("service unavailable")),
      );

      const result = await invoke(method, { signal: controller.signal });

      expect(result.isError).toBe(true);
      expect(method.mock.calls[0]?.[1]).toEqual({
        signal: controller.signal,
      });
    });
  });
});

describe("caller cancellation wins over token-provider failures", () => {
  function unauthorizedFetch() {
    return mock((_input: Parameters<typeof fetch>[0], _init?: RequestInit) =>
      Promise.resolve(
        new Response(JSON.stringify({ message: "Unauthorized" }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
  }

  function listTool(tokenProvider: TokenProvider, fetchFn: typeof fetch) {
    return createListTool(
      new ListServiceImpl(
        "https://source.example.test",
        tokenProvider,
        fetchFn,
      ),
    );
  }

  it("rejects list with the caller reason when token lookup fails after an abort", async () => {
    const controller = new AbortController();
    const reason = new Error("caller cancelled during token lookup");
    const fetchFn = unauthorizedFetch();
    const tool = listTool(
      {
        getToken: async () => {
          controller.abort(reason);
          throw new Error("token store unavailable");
        },
        forceRefresh: () => Promise.resolve("refreshed-token"),
      },
      fetchFn as unknown as typeof fetch,
    );

    await expect(
      tool.handler({ target: "npm:express" }, { signal: controller.signal }),
    ).rejects.toBe(reason);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rejects list with the caller reason when refresh fails after an abort", async () => {
    const controller = new AbortController();
    const reason = new Error("caller cancelled during refresh");
    const fetchFn = unauthorizedFetch();
    const tool = listTool(
      {
        getToken: () => Promise.resolve("expired-token"),
        forceRefresh: async () => {
          controller.abort(reason);
          throw new Error("refresh endpoint unavailable");
        },
      },
      fetchFn as unknown as typeof fetch,
    );

    await expect(
      tool.handler({ target: "npm:express" }, { signal: controller.signal }),
    ).rejects.toBe(reason);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
