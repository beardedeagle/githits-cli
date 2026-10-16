import { describe, expect, it } from "bun:test";
import { parseVersionRefRecovery } from "@githits/core-internal";
import { buildCliMappedErrorPayload } from "../../../../src/commands/format-mapped-error.js";
import { mcpMappedErrorResult } from "../tools/shared.js";
import type { MappedError } from "./mapped-error.js";
import { formatMappedErrorText } from "./mapped-error-text.js";
import {
  mapVersionRefRecovery,
  withVersionRefRecovery,
} from "./version-ref-recovery.js";

const version: MappedError = {
  code: "VERSION_NOT_FOUND",
  message: "Neutral backend prose. Did you mean v20.10.0+incompatible?",
  retryable: false,
  details: {
    package: "go:github.com/docker/docker",
    requestedVersion: "v20.10.0",
    availablePackageVersions: ["v20.10.0+incompatible"],
  },
};
const ref: MappedError = {
  code: "REF_NOT_FOUND",
  message: "Neutral prose. Did you mean v5.3.0? Verify the tag or branch.",
  retryable: false,
  details: {
    repoUrl: "https://github.com/expressjs/express",
    requestedRef: "bad",
    suggestedRefs: [{ ref: "v5.3.0" }, { ref: "v5.2.1" }],
    availableRefs: [{ ref: "HEAD" }],
  },
};

describe("native version/ref recovery", () => {
  it.each(["vulns", "deps", "changelog"])(
    "builds a runnable pkg %s command preserving controls",
    (command) => {
      const output = formatMappedErrorText(version, {
        recovery: {
          syntax: "cli",
          argv: [
            "pkg",
            command,
            "go:github.com/docker/docker@v20.10.0",
            "--verbose",
          ],
        },
      });
      expect(output).toContain(
        "Package go:github.com/docker/docker has no version v20.10.0.",
      );
      expect(output).toContain(
        `Try: githits pkg ${command} go:github.com/docker/docker@v20.10.0+incompatible --verbose`,
      );
      expect(output).not.toContain("Neutral");
      expect(output.match(/v20\.10\.0\+incompatible/g)).toHaveLength(1);
    },
  );
  it.each(["read", "list", "grep", "search"])(
    "builds native %s target recovery",
    (tool) => {
      const target = "github:expressjs/express@bad";
      const args =
        tool === "grep"
          ? { pattern: "bad", targets: [{ target, corpus: "code" }] }
          : tool === "search"
            ? { query: "bad", target }
            : { target, path: "README.md" };
      const output = mcpMappedErrorResult(ref, undefined, "text", {
        recovery: { syntax: "mcp", tool, args },
      }).content[0]!.text;
      expect(output).toContain(
        `Retry ${tool} with ${tool === "grep" ? "targets[0].target" : "target"}="github:expressjs/express@v5.3.0".`,
      );
      expect(output).toContain(
        "Repository https://github.com/expressjs/express has no ref bad.",
      );
      expect(output).not.toContain("Verify the tag");
      expect(output).not.toContain("HEAD");
    },
  );
  it("uses --git-ref for repository addressing and preserves path and bounds", () => {
    const result = withVersionRefRecovery(ref, {
      syntax: "cli",
      argv: [
        "read",
        "README.md",
        "--repo-url",
        "https://github.com/expressjs/express",
        "--git-ref",
        "bad",
        "--lines",
        "1-8",
      ],
    });
    expect(result.details?.action).toBe(
      "Try: githits read README.md --repo-url https://github.com/expressjs/express --git-ref v5.3.0 --lines 1-8",
    );
  });
  it("keeps grep patterns and other repository targets unchanged", () => {
    const result = withVersionRefRecovery(ref, {
      syntax: "cli",
      argv: [
        "grep",
        "github:expressjs/express@bad",
        "github:expressjs/express@bad",
        "github:other/repo@bad",
      ],
    });
    expect(result.details?.action).toBe(
      "Try: githits grep github:expressjs/express@bad github:expressjs/express@v5.3.0 github:other/repo@bad",
    );
  });
  it("preserves leading flags, grep patterns and target-like option values", () => {
    const target = "github:expressjs/express@bad";
    expect(
      withVersionRefRecovery(ref, {
        syntax: "cli",
        argv: ["read", "--verbose", target, "README.md"],
      }).details?.action,
    ).toBe(
      "Try: githits read --verbose github:expressjs/express@v5.3.0 README.md",
    );
    expect(
      withVersionRefRecovery(ref, {
        syntax: "cli",
        argv: ["grep", "-iF", "router", "--path-prefix", target, target],
      }).details?.action,
    ).toBe(
      "Try: githits grep -iF router --path-prefix github:expressjs/express@bad github:expressjs/express@v5.3.0",
    );
  });
  it("handles canonical Go normalization and preserves symbol suffixes", () => {
    const result = withVersionRefRecovery(version, {
      syntax: "mcp",
      tool: "read",
      args: { target: "go:github.com/docker/docker@20.10.0#Client" },
    });
    expect(result.details?.action).toContain(
      'target="go:github.com/docker/docker@v20.10.0+incompatible#Client"',
    );
  });
  it("uses real upgrade-review parameter names in single and batch mode", () => {
    const row = {
      registry: "go",
      package_name: "github.com/docker/docker",
      current_version: "v1.0.0",
      target_version: "v20.10.0",
    };
    expect(
      withVersionRefRecovery(version, {
        syntax: "mcp",
        tool: "pkg_upgrade_review",
        args: row,
      }).details?.action,
    ).toContain('target_version="v20.10.0+incompatible"');
    expect(
      withVersionRefRecovery(version, {
        syntax: "mcp",
        tool: "pkg_upgrade_review",
        args: { packages: [row] },
      }).details?.action,
    ).toContain('packages[0].target_version="v20.10.0+incompatible"');
  });
  it("retains code-diff side and uses from/to rather than target revision suffixes", () => {
    const mapped: MappedError = {
      code: "REF_NOT_FOUND",
      message: "Missing ref bad in repository.",
      details: { side: "to", suggestedRefs: [{ ref: "v5.3.0" }] },
    };
    const result = withVersionRefRecovery(mapped, {
      syntax: "mcp",
      tool: "code_diff",
      args: { target: "github:expressjs/express", from: "v4", to: "bad" },
    });
    expect(result.details?.action).toContain('to="v5.3.0"');
    expect(formatMappedErrorText(result)).toContain("Comparison side: to");
  });
  it("quotes shell operands and leaves unknown codes and missing identities verbatim", () => {
    const tricky = {
      ...ref,
      details: { ...ref.details, suggestedRefs: [{ ref: "fix/it's;$HOME" }] },
    };
    const result = withVersionRefRecovery(tricky, {
      syntax: "cli",
      argv: ["read", "github:expressjs/express@bad", "README.md"],
    });
    expect(result.details?.action).toContain(
      "'github:expressjs/express@fix/it'\"'\"'s;$HOME'",
    );
    expect(
      formatMappedErrorText({
        code: "BACKEND_ERROR",
        message: "Future backend code.",
      }),
    ).toBe("Future backend code.");
    expect(
      formatMappedErrorText({
        code: "VERSION_NOT_FOUND",
        message: "Missing fields.",
      }),
    ).toBe("Missing fields.");
    expect(
      withVersionRefRecovery(ref, {
        syntax: "mcp",
        tool: "read",
        args: { target: "github:other/repo@bad" },
      }).details?.action,
    ).toBeUndefined();
  });
  it("keeps all structured suggestions and backend prose in both JSON envelopes", () => {
    const releases = Array.from({ length: 10 }, (_, i) => `5.${10 - i}.0`);
    const mapped = mapVersionRefRecovery(
      "Backend verbatim.",
      parseVersionRefRecovery({
        code: "VERSION_NOT_FOUND",
        package: "npm:express",
        requested_version: "99",
        latest_version: releases[0],
        available_package_versions: releases,
        available_versions: [{ ref: "v4", version: "4" }],
      })!,
    );
    const cli = buildCliMappedErrorPayload(mapped);
    const mcp = JSON.parse(
      mcpMappedErrorResult(mapped, undefined, "json").content[0]!.text,
    );
    expect(cli).toEqual(mcp);
    expect(cli.error).toBe("Backend verbatim.");
    expect(cli.details?.availablePackageVersions).toEqual(releases);
    expect(cli.details?.availableVersions).toEqual([
      { ref: "v4", version: "4" },
    ]);
    expect(formatMappedErrorText(mapped)).toContain("(+5 more)");
  });
});
