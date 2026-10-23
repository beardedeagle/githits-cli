import { describe, expect, it } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";

const pinnedBunVersion = '"1.4.4"';
const matrixBunVersion = "$" + "{{ matrix.bun-version }}";
const pinnedAction = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/;
const versionComment = /^v\d+\.\d+\.\d+$/;
const privilegedJobs = new Map<string, string>([
  ["release.yml", "release"],
  ["mcp-release.yml", "publish"],
]);

interface WorkflowJob {
  permissions?: Record<string, string>;
  uses?: string;
}

interface WorkflowFile {
  jobs?: Record<string, WorkflowJob>;
  on?: Record<string, unknown>;
  permissions?: Record<string, string>;
}

function permissionKeys(
  permissions: Record<string, string> | undefined,
): string[] {
  return Object.keys(permissions ?? {}).sort();
}

describe("GitHub Actions supply-chain pins", () => {
  it("pins third-party actions and Bun 1.4.4 without widening token permissions", async () => {
    const workflowDirectory = join(
      import.meta.dir,
      "..",
      ".github",
      "workflows",
    );
    const workflowNames = (await readdir(workflowDirectory))
      .filter((name) => name.endsWith(".yml"))
      .sort();

    expect(workflowNames).toEqual([
      "agent-evals.yml",
      "ci.yml",
      "main.yml",
      "mcp-release.yml",
      "pr.yml",
      "release.yml",
    ]);

    for (const workflowName of workflowNames) {
      const source = await readFile(
        join(workflowDirectory, workflowName),
        "utf8",
      );
      const uses = [...source.matchAll(/^[ \t]*uses:[ \t]*(.+)$/gm)].map(
        (match) => match[1] ?? "",
      );
      expect(uses.length).toBeGreaterThan(0);

      for (const rawUse of uses) {
        const [action, comment] = rawUse.split(/\s+#\s*/);
        if (action?.startsWith("./")) {
          expect(comment).toBeUndefined();
          expect(action).not.toContain("@");
          continue;
        }

        expect(action).toMatch(pinnedAction);
        expect(comment).toMatch(versionComment);
      }

      const bunVersions = [
        ...source.matchAll(/^[ \t]*bun-version:[ \t]*(.+)$/gm),
      ].flatMap((match) => {
        const bunVersion = match[1];
        return bunVersion === undefined ? [] : [bunVersion];
      });
      for (const bunVersion of bunVersions) {
        expect([pinnedBunVersion, matrixBunVersion]).toContain(bunVersion);
      }
      if (workflowName !== "main.yml" && workflowName !== "pr.yml") {
        expect(bunVersions).toContain(pinnedBunVersion);
      }

      const workflow = parseYaml(source) as WorkflowFile;
      const workflowPermissions = workflow.permissions ?? {};
      expect(permissionKeys(workflowPermissions)).toEqual(
        workflowName === "agent-evals.yml" ? ["contents"] : [],
      );
      if (workflowName === "agent-evals.yml") {
        expect(workflowPermissions.contents).toBe("read");
      }

      const jobs = workflow.jobs ?? {};
      const privilegedJob = privilegedJobs.get(workflowName);
      if (privilegedJob !== undefined) {
        expect(jobs[privilegedJob]?.permissions).toEqual({
          contents: "write",
          "id-token": "write",
        });
      }

      for (const [jobName, job] of Object.entries(jobs)) {
        if (jobName === privilegedJob) continue;
        if (job.permissions === undefined) {
          expect(job.uses).toBeUndefined();
          continue;
        }
        expect(job.permissions).toEqual({ contents: "read" });
      }

      if (workflowName === "release.yml") {
        expect(Object.keys(workflow.on ?? {}).sort()).toEqual(["workflow_run"]);
      }
    }
  });
});
