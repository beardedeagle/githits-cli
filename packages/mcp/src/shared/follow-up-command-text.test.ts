import { describe, expect, it } from "bun:test";
import type { UnifiedSearchSemanticPreferredRead } from "@githits/core-internal";
import { parseCodeNavigationTargetSpec } from "./code-navigation-target.js";
import { buildSearchHitFollowUpCommand } from "./follow-up-command-text.js";
import type { UnifiedSearchHitPayload } from "./unified-search-response.js";

const commitSha = "0123456789abcdef0123456789abcdef01234567";
const preferredRead: UnifiedSearchSemanticPreferredRead = {
  targetLabel: "npm:pkg@1.2.3",
  registry: "npm",
  packageName: "pkg",
  version: "1.2.3",
  repoUrl: "https://github.com/owner/monorepo",
  gitRef: commitSha,
  commitSha,
  requestedRef: "main",
  filePath: "src/client.ts",
  repositoryFilePath: "packages/pkg/src/client.ts",
  startLine: 120,
  endLine: 165,
};

function hit(
  read: UnifiedSearchSemanticPreferredRead,
): UnifiedSearchHitPayload {
  return {
    type: "repository_doc",
    target: "github:owner/monorepo@main",
    locator: { pageId: "opaque-page", filePath: "different-path.md" },
    repositoryEvidence: {
      semanticContext: {
        scopes: [],
        scopeChainTruncated: false,
        preferredRead: read,
      },
    },
  };
}

describe("semantic preferred reads", () => {
  it("uses package attribution and source context before a repository doc page ID", () => {
    expect(buildSearchHitFollowUpCommand(hit(preferredRead))).toBe(
      'read target="npm:pkg@1.2.3" path="src/client.ts" start_line=120 end_line=165',
    );
    expect(buildSearchHitFollowUpCommand(hit(preferredRead), "cli")).toBe(
      "githits read 'npm:pkg@1.2.3' 'src/client.ts' --lines 120-165",
    );
  });

  it("pairs exact repository commits with repository-root paths", () => {
    const read = {
      ...preferredRead,
      registry: null,
      packageName: null,
      version: null,
    };
    const target = `github:owner/monorepo@${commitSha}`;
    expect(buildSearchHitFollowUpCommand(hit(read))).toBe(
      `read target="${target}" path="packages/pkg/src/client.ts" start_line=120 end_line=165`,
    );
    expect(buildSearchHitFollowUpCommand(hit(read), "cli")).toBe(
      `githits read '${target}' 'packages/pkg/src/client.ts' --lines 120-165`,
    );
    expect(parseCodeNavigationTargetSpec(target)).toEqual({
      repoUrl: preferredRead.repoUrl,
      gitRef: commitSha,
    });
  });

  it.each(["github:owner/monorepo@main", "owner/monorepo@main"])(
    "honors repository label %s even when synthetic package metadata is populated",
    (targetLabel) => {
      const read = {
        ...preferredRead,
        targetLabel,
        version: commitSha,
      };
      const target = `github:owner/monorepo@${commitSha}`;
      expect(buildSearchHitFollowUpCommand(hit(read))).toBe(
        `read target="${target}" path="packages/pkg/src/client.ts" start_line=120 end_line=165`,
      );
      expect(buildSearchHitFollowUpCommand(hit(read), "cli")).toBe(
        `githits read '${target}' 'packages/pkg/src/client.ts' --lines 120-165`,
      );
    },
  );

  it("bounds only the MCP action around the focused evidence and retains true bounds", () => {
    const read = { ...preferredRead, startLine: 1, endLine: 600 };
    const value = hit(read);
    expect(buildSearchHitFollowUpCommand(value)).toBe(
      'read target="npm:pkg@1.2.3" path="src/client.ts" start_line=1 end_line=300',
    );
    expect(buildSearchHitFollowUpCommand(value, "cli")).toEndWith(
      "--lines 1-600",
    );
    expect(read.endLine).toBe(600);
    expect(
      buildSearchHitFollowUpCommand(hit({ ...read, endLine: 300 })),
    ).toEndWith("start_line=1 end_line=300");
    expect(
      buildSearchHitFollowUpCommand(hit({ ...read, endLine: 301 })),
    ).toEndWith("start_line=1 end_line=300");
  });

  it("bounds a wider read around matched source", () => {
    const value = hit({ ...preferredRead, startLine: 1, endLine: 1000 });
    value.repositoryEvidence!.matchedSource = {
      startLine: 700,
      endLine: 705,
      matchLine: 702,
      rangeKind: "syntax_context",
      matchSpansTruncated: false,
      lines: [],
      linesOmittedBefore: false,
      linesOmittedAfter: false,
    };
    expect(buildSearchHitFollowUpCommand(value)).toEndWith(
      "start_line=553 end_line=852",
    );
    expect(
      value.repositoryEvidence!.semanticContext!.preferredRead.endLine,
    ).toBe(1000);
  });

  it("keeps preferred reads usable without matched source", () => {
    const value = hit(preferredRead);
    expect(buildSearchHitFollowUpCommand(value)).toEndWith(
      "start_line=120 end_line=165",
    );
    value.repositoryEvidence!.semanticContext = null;
    expect(buildSearchHitFollowUpCommand(value)).toBe(
      'read target="opaque-page"',
    );
  });
});

function documentationHit(
  locator: UnifiedSearchHitPayload["locator"],
): UnifiedSearchHitPayload {
  return {
    type: "documentation_page",
    target: "npm:example",
    locator,
  };
}

function repositoryDocumentationHit(
  locator: UnifiedSearchHitPayload["locator"],
): UnifiedSearchHitPayload {
  return {
    type: "repository_doc",
    target: "github:example/docs@0123456789abcdef",
    locator,
  };
}

function packageDocumentationHit(
  locator: Partial<UnifiedSearchHitPayload["locator"]> = {},
): UnifiedSearchHitPayload {
  const docsReadTarget = `github:owner/repo@${commitSha}/packages/pkg/docs/auth.md`;
  return {
    type: "repository_doc",
    target: "npm:pkg@1.2.3",
    locator: {
      registry: "npm",
      packageName: "pkg",
      version: "1.2.3",
      filePath: "docs/auth.md",
      repositoryFilePath: "packages/pkg/docs/auth.md",
      repoUrl: "https://github.com/owner/repo",
      commitSha,
      pageId: docsReadTarget,
      docsReadTarget,
      startLine: 42,
      endLine: 52,
      ...locator,
    },
  };
}

describe("buildSearchHitFollowUpCommand documentation targets", () => {
  it.each(["docs/auth.md", "packages/pkg/docs/auth.md"])(
    "uses package addressing and the target-relative docs path with repository path %s",
    (repositoryFilePath) => {
      const value = packageDocumentationHit({ repositoryFilePath });
      expect(buildSearchHitFollowUpCommand(value)).toBe(
        'read target="npm:pkg@1.2.3" path="docs/auth.md" start_line=42 end_line=52',
      );
      expect(buildSearchHitFollowUpCommand(value, "cli")).toBe(
        "githits read 'npm:pkg@1.2.3' 'docs/auth.md' --lines 42-52",
      );
    },
  );

  it("reads package docs without a legacy page ID", () => {
    expect(
      buildSearchHitFollowUpCommand(
        packageDocumentationHit({
          pageId: undefined,
          docsReadTarget: undefined,
        }),
      ),
    ).toBe(
      'read target="npm:pkg@1.2.3" path="docs/auth.md" start_line=42 end_line=52',
    );
  });

  it("retains docs locators for repository attribution and incomplete package metadata", () => {
    const value = packageDocumentationHit();
    for (const hit of [
      { ...value, target: "github:owner/repo@main" },
      packageDocumentationHit({ version: undefined }),
      packageDocumentationHit({ filePath: undefined }),
    ]) {
      expect(buildSearchHitFollowUpCommand(hit)).toBe(
        `read target="${value.locator.docsReadTarget}" start_line=42 end_line=52`,
      );
    }
  });

  it("bounds package docs MCP follow-ups around evidence while CLI keeps the full range", () => {
    const value = packageDocumentationHit({
      startLine: 1,
      endLine: 600,
      evidenceRange: {
        startLine: 400,
        endLine: 410,
        matchLine: 405,
        matchSpansTruncated: false,
      },
    });
    const command = buildSearchHitFollowUpCommand(value);
    const bounds = /start_line=(\d+) end_line=(\d+)/.exec(command)!;
    const startLine = Number(bounds[1]);
    const endLine = Number(bounds[2]);
    expect(command).toContain(
      'read target="npm:pkg@1.2.3" path="docs/auth.md"',
    );
    expect(endLine - startLine + 1).toBe(300);
    expect(startLine).toBeLessThanOrEqual(400);
    expect(endLine).toBeGreaterThanOrEqual(410);
    expect(buildSearchHitFollowUpCommand(value, "cli")).toBe(
      "githits read 'npm:pkg@1.2.3' 'docs/auth.md' --lines 1-600",
    );
  });

  it("emits unified read syntax for both documentation follow-up surfaces", () => {
    const value = documentationHit({ pageId: "legacy-crawled-id" });

    const mcpCommand = buildSearchHitFollowUpCommand(value);
    const cliCommand = buildSearchHitFollowUpCommand(value, "cli");

    expect(mcpCommand).toMatch(/^read target=/);
    expect(cliCommand).toMatch(/^githits read /);
    expect(`${mcpCommand}\n${cliCommand}`).not.toMatch(
      /(?:code_read|docs_read|githits (?:code|docs) read|page_id=)/,
    );
  });

  it("uses an emitted crawled-doc fragment without search-window bounds", () => {
    const docsReadTarget = "https://docs.example.test/guide?q=exact";
    const sourceUrl = `${docsReadTarget}#routing`;

    const value = documentationHit({
      pageId: "legacy-crawled-id",
      docsReadTarget,
      sourceUrl,
      startLine: 81,
      endLine: 93,
    });

    expect(buildSearchHitFollowUpCommand(value)).toBe(
      `read target=${JSON.stringify(sourceUrl)}`,
    );
    expect(buildSearchHitFollowUpCommand(value, "cli")).toBe(
      `githits read '${sourceUrl}'`,
    );
  });

  it("omits stale search coordinates from a mutable hosted page follow-up", () => {
    const docsReadTarget = "https://docs.example.test/guide?q=exact";
    const value = documentationHit({
      pageId: docsReadTarget,
      docsReadTarget,
      sourceUrl: docsReadTarget,
      // These coordinates describe the publication searched, not the body that
      // this mutable URL may serve when the generated follow-up is executed.
      startLine: 81,
      endLine: 93,
    });

    expect(buildSearchHitFollowUpCommand(value)).toBe(
      `read target=${JSON.stringify(docsReadTarget)}`,
    );
    expect(buildSearchHitFollowUpCommand(value, "cli")).toBe(
      `githits read '${docsReadTarget}'`,
    );
  });

  it("recognizes a mixed-case HTTP scheme when promoting a source fragment", () => {
    const docsReadTarget = "HTTPS://docs.example.test/guide?q=exact";
    const sourceUrl = `${docsReadTarget}#routing`;

    expect(
      buildSearchHitFollowUpCommand(
        documentationHit({
          pageId: "legacy-crawled-id",
          docsReadTarget,
          sourceUrl,
          startLine: 81,
          endLine: 93,
        }),
      ),
    ).toBe(`read target=${JSON.stringify(sourceUrl)}`);
  });

  it("passes an existing fragment unchanged without search-window bounds", () => {
    const docsReadTarget = "https://docs.example.test/guide#routing";

    expect(
      buildSearchHitFollowUpCommand(
        documentationHit({
          pageId: "legacy-crawled-id",
          docsReadTarget,
          sourceUrl: docsReadTarget,
          startLine: 81,
          endLine: 93,
        }),
      ),
    ).toBe(`read target=${JSON.stringify(docsReadTarget)}`);
  });

  it("passes a mixed-case HTTP target with a fragment unchanged", () => {
    const docsReadTarget = "HtTp://docs.example.test/guide#routing";

    expect(
      buildSearchHitFollowUpCommand(
        documentationHit({
          pageId: "legacy-crawled-id",
          docsReadTarget,
          startLine: 81,
          endLine: 93,
        }),
      ),
    ).toBe(`read target=${JSON.stringify(docsReadTarget)}`);
  });

  it("retains snapshot ranges for repository documentation", () => {
    const docsReadTarget =
      "github:example/docs@0123456789abcdef/guide/routing.md";
    const value = repositoryDocumentationHit({
      pageId: docsReadTarget,
      docsReadTarget,
      sourceUrl:
        "https://github.com/example/docs/blob/0123456789abcdef/guide/routing.md",
      startLine: 81,
      endLine: 93,
    });

    expect(buildSearchHitFollowUpCommand(value)).toBe(
      `read target=${JSON.stringify(docsReadTarget)} start_line=81 end_line=93`,
    );
    expect(buildSearchHitFollowUpCommand(value, "cli")).toBe(
      `githits read '${docsReadTarget}' --lines 81-93`,
    );
  });

  it("shell-quotes mutable publisher URLs without stale search coordinates", () => {
    const docsReadTarget =
      "https://docs.example.test/guide with spaces;$(echo nope)?q='quoted'&x=*";

    expect(
      buildSearchHitFollowUpCommand(
        documentationHit({
          pageId: "legacy-crawled-id",
          docsReadTarget,
          startLine: 10,
          endLine: 20,
        }),
        "cli",
      ),
    ).toBe(
      `githits read 'https://docs.example.test/guide with spaces;$(echo nope)?q='"'"'quoted'"'"'&x=*'`,
    );
  });

  it("treats an HTTP pageId fallback as a mutable current-content address", () => {
    const pageId = "HTTPS://docs.example.test/current";

    expect(
      buildSearchHitFollowUpCommand(
        documentationHit({ pageId, startLine: 10, endLine: 20 }),
      ),
    ).toBe(`read target=${JSON.stringify(pageId)}`);
  });

  it("falls back to pageId when discovery omits docsReadTarget", () => {
    expect(
      buildSearchHitFollowUpCommand(
        documentationHit({ pageId: "legacy-crawled-id" }),
      ),
    ).toBe('read target="legacy-crawled-id"');
  });
});
