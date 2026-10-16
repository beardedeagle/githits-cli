import { describe, expect, it } from "bun:test";
import {
  createPackageIntelligenceGraphQLError,
  PackageIntelligenceVersionNotFoundError,
} from "./package-intelligence-service.js";
import { parseVersionRefRecovery } from "./version-ref-recovery.js";

describe("public version/ref recovery fields", () => {
  it("separates registry releases from indexed snapshots and retains producer ordering", () => {
    const ext = {
      code: "VERSION_NOT_FOUND",
      retryable: false,
      package: "npm:express",
      requested_version: "99.0.0",
      latest_version: "5.3.0",
      latest_indexed: "5.2.0",
      available_package_versions: ["5.3.0", "5.2.1"],
      available_versions: [{ ref: "v5.2.0", version: "5.2.0" }],
      input_path: ["targets", 0],
    };
    const result = parseVersionRefRecovery(ext)!;
    expect(result).toEqual({
      code: "VERSION_NOT_FOUND",
      retryable: false,
      package: "npm:express",
      requestedVersion: "99.0.0",
      latestVersion: "5.3.0",
      latestIndexed: "5.2.0",
      availablePackageVersions: ["5.3.0", "5.2.1"],
      availableVersions: [{ ref: "v5.2.0", version: "5.2.0" }],
      inputPath: ["targets", 0],
    });
    const error = createPackageIntelligenceGraphQLError([
      { message: "neutral", extensions: ext },
    ]);
    expect(error).toBeInstanceOf(PackageIntelligenceVersionNotFoundError);
    expect(
      (error as PackageIntelligenceVersionNotFoundError).availableVersions,
    ).toEqual(ext.available_package_versions);
    expect((error as PackageIntelligenceVersionNotFoundError).recovery).toEqual(
      result,
    );
  });
  it("retains nullable ref versions without inventing package versions", () => {
    const recovery = parseVersionRefRecovery({
      code: "REF_NOT_FOUND",
      repo_url: "https://github.com/expressjs/express",
      git_ref: "bad",
      available_refs: [{ ref: "HEAD", version: null }],
      suggested_refs: [{ ref: "v5.3.0", version: "5.3.0" }],
    });
    expect(recovery?.availableRefs).toEqual([{ ref: "HEAD", version: null }]);
    expect(recovery?.suggestedRefs).toEqual([
      { ref: "v5.3.0", version: "5.3.0" },
    ]);
  });
  it.each([
    undefined,
    {},
    {
      code: "NEW_CODE",
      requested_version: "1",
      available_package_versions: ["2"],
    },
  ])("ignores absent/unknown codes: %j", (ext) => {
    expect(parseVersionRefRecovery(ext)).toBeUndefined();
  });
  it("ignores malformed fields and the obsolete string available_versions shape", () => {
    expect(
      parseVersionRefRecovery({
        code: "VERSION_NOT_FOUND",
        package: [],
        requested_version: null,
        latest_version: 1,
        available_package_versions: ["1", 2],
        available_versions: ["1"],
        available_refs: "HEAD",
        suggested_refs: [{ ref: 5 }],
        input_path: [-1],
      }),
    ).toEqual({ code: "VERSION_NOT_FOUND" });
  });
  it("preserves existing camel-case ref aliases without reading registry strings as indexed refs", () => {
    expect(
      parseVersionRefRecovery({
        code: "REF_NOT_FOUND",
        repoUrl: "https://github.com/expressjs/express",
        gitRef: "bad",
        availableRefs: [{ ref: "HEAD" }],
        suggestedRefs: [{ ref: "v5.3.0" }],
      }),
    ).toEqual({
      code: "REF_NOT_FOUND",
      repoUrl: "https://github.com/expressjs/express",
      requestedRef: "bad",
      availableRefs: [{ ref: "HEAD" }],
      suggestedRefs: [{ ref: "v5.3.0" }],
    });
  });
  it("accepts omitted fields, empty inventories and additive fields", () => {
    expect(
      parseVersionRefRecovery({
        code: "REF_NOT_FOUND",
        available_refs: [],
        suggested_refs: [],
        future: { key: 1 },
      }),
    ).toEqual({ code: "REF_NOT_FOUND", availableRefs: [], suggestedRefs: [] });
  });
});

describe("service recovery propagation", () => {
  it("retains the same typed facts in list and code navigation errors", async () => {
    const { createCodeNavigationGraphQLError } = await import(
      "./code-navigation-service.js"
    );
    const { ListServiceImpl, ListGraphQLError } = await import(
      "./list-service.js"
    );
    const { createMockTokenProvider } = await import("./test-helpers.js");
    const ext = {
      code: "REF_NOT_FOUND",
      retryable: false,
      repo_url: "https://github.com/expressjs/express",
      git_ref: "bad",
      available_refs: [{ ref: "HEAD", version: null }],
      suggested_refs: [{ ref: "v5.3.0", version: null }],
      target_index: 0,
      target_count: 2,
      input_path: ["targets", 0],
    };
    const expected = parseVersionRefRecovery(ext);
    const nav = createCodeNavigationGraphQLError([
      { message: "verbatim", extensions: ext },
    ]);
    expect(nav).toHaveProperty("recovery", expected);
    const service = new ListServiceImpl(
      "https://pkgseer.dev",
      createMockTokenProvider(),
      Object.assign(
        async () =>
          new Response(
            JSON.stringify({
              errors: [{ message: "verbatim", extensions: ext }],
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        { preconnect: () => {} },
      ),
    );
    let error: unknown;
    try {
      await service.list({
        target: "github:expressjs/express@bad",
        includeDetailedFields: false,
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ListGraphQLError);
    expect((error as InstanceType<typeof ListGraphQLError>).recovery).toEqual(
      expected,
    );
  });
});
