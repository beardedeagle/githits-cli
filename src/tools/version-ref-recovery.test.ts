import { describe, expect, it, mock } from "bun:test";
import {
  CodeDiffError,
  createCodeNavigationGraphQLError,
  createPackageIntelligenceGraphQLError,
  GrepGraphQLError,
  ListGraphQLError,
  parseVersionRefRecovery,
} from "@githits/core-internal";
import {
  createMockCodeNavigationService,
  createMockGrepService,
  createMockListService,
  createMockPackageIntelligenceService,
  createMockReadService,
  createMockResolveTargetService,
} from "../services/test-helpers.js";
import { createParityMcpTool } from "./parity-test-helpers.js";

const ext = {
  code: "VERSION_NOT_FOUND",
  retryable: false,
  package: "npm:express",
  requested_version: "99.0.0",
  latest_version: "5.3.0",
  available_package_versions: ["5.3.0", "5.2.1"],
};
const refExt = {
  code: "REF_NOT_FOUND",
  retryable: false,
  repo_url: "https://github.com/expressjs/express",
  git_ref: "bad",
  available_refs: [{ ref: "HEAD", version: null }],
  suggested_refs: [{ ref: "v5.3.0", version: null }],
};

describe("version/ref recovery at actual MCP boundaries", () => {
  it.each([
    {
      tool: "pkg_vulns",
      method: "packageVulnerabilities",
      args: { target: "npm:express@99.0.0" },
      field: 'target="npm:express@5.3.0"',
    },
    {
      tool: "pkg_deps",
      method: "packageDependencies",
      args: { target: "npm:express@99.0.0" },
      field: 'target="npm:express@5.3.0"',
    },
    {
      tool: "pkg_changelog",
      method: "packageChangelog",
      args: { target: "npm:express@99.0.0" },
      field: 'target="npm:express@5.3.0"',
    },
    {
      tool: "pkg_upgrade_review",
      method: "packageUpgradeReview",
      args: {
        registry: "npm",
        package_name: "express",
        current_version: "4.0.0",
        target_version: "99.0.0",
      },
      field: 'target_version="5.3.0"',
    },
  ])(
    "uses native arguments for $tool",
    async ({ tool, method, args, field }) => {
      const failure = createPackageIntelligenceGraphQLError([
        { message: "Neutral. Did you mean 5.3.0, 5.2.1?", extensions: ext },
      ]);
      const service = createMockPackageIntelligenceService({
        [method]: mock(() => Promise.reject(failure)),
      });
      const definition = createParityMcpTool<Record<string, unknown>>(tool, {
        packageIntelligenceService: service,
      });
      const result = await definition.handler(args, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain(`Retry ${tool} with ${field}`);
      const json = JSON.parse(
        (await definition.handler({ ...args, format: "json" }, {})).content[0]!
          .text,
      );
      expect(json.error).toBe(failure.message);
      expect(json.details.availablePackageVersions).toEqual(
        ext.available_package_versions,
      );
      expect(json.details.latestVersion).toBe("5.3.0");
      expect(json.details.action).toBe(`Retry ${tool} with ${field}.`);
    },
  );
  it.each(["pkg_info", "resolve_target"])(
    "preserves unexpected recovery facts without inventing version inputs for %s",
    async (tool) => {
      const failure = createPackageIntelligenceGraphQLError([
        { message: "Backend verbatim.", extensions: ext },
      ]);
      const service = createMockPackageIntelligenceService({
        packageSummary: mock(() => Promise.reject(failure)),
      });
      const resolve = createMockResolveTargetService({
        resolveTarget: mock(() => Promise.reject(failure)),
      });
      const definition = createParityMcpTool<Record<string, unknown>>(tool, {
        packageIntelligenceService: service,
        resolveTargetService: resolve,
      });
      const args =
        tool === "pkg_info" ? { target: "npm:express" } : { name: "express" };
      const result = await definition.handler({ ...args, format: "json" }, {});
      expect(
        JSON.parse(result.content[0]!.text).details.availablePackageVersions,
      ).toEqual(ext.available_package_versions);
      const text = (await definition.handler(args, {})).content[0]!.text;
      expect(text).not.toContain(`Retry ${tool}`);
    },
  );
  it.each(["read", "list", "grep", "search"])(
    "preserves ref records and native correction for %s",
    async (tool) => {
      const failure = createCodeNavigationGraphQLError([
        { message: "Neutral. Did you mean v5.3.0?", extensions: refExt },
      ]);
      const definition = createParityMcpTool<Record<string, unknown>>(tool, {
        readService: createMockReadService({
          read: mock(() => Promise.reject(failure)),
        }),
        listService: createMockListService({
          list: mock(() =>
            Promise.reject(
              new ListGraphQLError(
                failure.message,
                "REF_NOT_FOUND",
                false,
                undefined,
                undefined,
                undefined,
                undefined,
                undefined,
                parseVersionRefRecovery(refExt),
              ),
            ),
          ),
        }),
        grepService: createMockGrepService({
          grep: mock(() =>
            Promise.reject(new GrepGraphQLError(failure.message, refExt)),
          ),
        }),
        codeNavigationService: createMockCodeNavigationService({
          search: mock(() => Promise.reject(failure)),
        }),
      });
      const target = "github:expressjs/express@bad";
      const args =
        tool === "grep"
          ? { pattern: "router", targets: [{ target }] }
          : tool === "search"
            ? { query: "router", target }
            : { target, path: "README.md" };
      const result = await definition.handler(args, {});
      expect(result.isError).toBe(true);
      expect(result.content[0]!.text).toContain(`Retry ${tool} with `);
      expect(result.content[0]!.text).not.toContain("HEAD");
      const json = JSON.parse(
        (await definition.handler({ ...args, format: "json" }, {})).content[0]!
          .text,
      );
      expect(json.code).toBe("REF_NOT_FOUND");
      expect(json.details.availableRefs).toEqual(refExt.available_refs);
      expect(json.details.suggestedRefs).toEqual(refExt.suggested_refs);
      expect(json.details.action).toBe(
        `Retry ${tool} with ${tool === "grep" ? "targets[0].target" : "target"}="github:expressjs/express@v5.3.0".`,
      );
    },
  );
});

it("does not turn code-diff ambiguity into a nonexistent-ref claim or arbitrary retry", async () => {
  const tool = createParityMcpTool<Record<string, unknown>>("code_diff", {
    codeNavigationService: createMockCodeNavigationService({
      codeDiff: mock(() =>
        Promise.reject(
          new CodeDiffError("The ref matches both a branch and a tag.", {
            code: "AMBIGUOUS_REF",
            repoUrl: refExt.repo_url,
            gitRef: "release",
            refKinds: ["BRANCH", "TAG"],
            availableRefs: [{ ref: "other" }],
          }),
        ),
      ),
    }),
  });
  const text = (
    await tool.handler(
      { target: "github:expressjs/express", from: "v4", to: "release" },
      {},
    )
  ).content[0]!.text;
  expect(text).toContain("The ref matches both a branch and a tag.");
  expect(text).not.toContain("has no ref");
  expect(text).not.toContain("Retry code_diff");
});
