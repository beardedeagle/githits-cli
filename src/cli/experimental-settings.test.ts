import { describe, expect, it } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const configHomeEnvKey =
  process.platform === "win32" ? "APPDATA" : "XDG_CONFIG_HOME";
const alternateConfigHomeEnvKey =
  configHomeEnvKey === "APPDATA" ? "XDG_CONFIG_HOME" : "APPDATA";

async function runCli(
  configHome: string,
  args: string[],
  isolatedHome?: string,
): Promise<CliResult> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GITHITS_DISABLE_UPDATE_CHECK: "1",
    GITHITS_ENV: "invalid",
    GITHITS_API_URL: "not-a-url",
    GITHITS_MCP_URL: "not-a-url",
    GITHITS_ACCOUNTS_URL: "not-a-url",
    GITHITS_CODE_NAV_URL: "not-a-url",
    NO_COLOR: "1",
  };
  delete env.GITHITS_API_TOKEN;
  if (isolatedHome !== undefined) {
    env.HOME = isolatedHome;
    env.USERPROFILE = isolatedHome;
  }
  env[configHomeEnvKey] = configHome;
  delete env[alternateConfigHomeEnvKey];

  const child = Bun.spawn(["bun", "run", "src/cli.ts", ...args], {
    cwd: process.cwd(),
    env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  return { stdout, stderr, exitCode };
}

function expectDiffHelp(result: CliResult): void {
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Usage: githits code diff");
  expect(result.stdout).toContain("<from>..<to>");
  expect(result.stderr).not.toContain("Invalid GITHITS_API_URL");
  expect(result.stderr).not.toContain("Invalid GITHITS_MCP_URL");
  expect(result.stderr).not.toContain("Invalid GITHITS_ACCOUNTS_URL");
  expect(result.stderr).not.toContain("Invalid GITHITS_CODE_NAV_URL");
}

function expectResolveHelp(result: CliResult): void {
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain("Usage: githits resolve");
  expect(result.stderr).not.toContain("Invalid GITHITS_API_URL");
  expect(result.stderr).not.toContain("Invalid GITHITS_MCP_URL");
  expect(result.stderr).not.toContain("Invalid GITHITS_ACCOUNTS_URL");
  expect(result.stderr).not.toContain("Invalid GITHITS_CODE_NAV_URL");
}

async function withConfig<T>(
  contents: string | undefined,
  fn: (configHome: string) => Promise<T>,
): Promise<T> {
  const configHome = await mkdtemp(join(tmpdir(), "githits-cli-policy-"));
  try {
    if (contents !== undefined) {
      const configDir = join(configHome, "githits");
      await mkdir(configDir, { recursive: true });
      await writeFile(join(configDir, "config.toml"), contents);
    }
    return await fn(configHome);
  } finally {
    await rm(configHome, { recursive: true, force: true });
  }
}

async function withMissingConfig<T>(
  fn: (configHome: string, isolatedHome: string) => Promise<T>,
): Promise<T> {
  const configHome = await mkdtemp(
    join(tmpdir(), "githits-cli-missing-config-"),
  );
  const isolatedHome = await mkdtemp(
    join(tmpdir(), "githits-cli-missing-home-"),
  );
  try {
    return await fn(configHome, isolatedHome);
  } finally {
    await rm(configHome, { recursive: true, force: true });
    await rm(isolatedHome, { recursive: true, force: true });
  }
}

function expectResearchHelp(result: CliResult, command: string): void {
  expect(result.exitCode).toBe(0);
  expect(result.stdout).toContain(`Usage: githits ${command}`);
  expect(result.stdout).toContain("[target] <question>");
  expect(result.stdout).toContain("--source-format <format>");
  expect(result.stdout).toContain('choices: "cli", "url"');
  expect(result.stdout).toContain("--json");
  expect(result.stderr).not.toContain("Experimental");
  expect(result.stderr).not.toContain("Invalid GITHITS_API_URL");
}

async function expectStableSurface(
  xdgConfigHome: string,
  isolatedHome?: string,
): Promise<void> {
  const root = await runCli(xdgConfigHome, ["--help"], isolatedHome);
  expect(root.exitCode).toBe(0);
  expect(root.stdout).toMatch(/^\s+research \[options\]/m);
  expect(root.stdout).toContain('githits research npm:express "How?"');
  expect(root.stdout).toContain("githits resolve express");

  expectResearchHelp(
    await runCli(xdgConfigHome, ["research", "--help"], isolatedHome),
    "research",
  );
  expectResearchHelp(
    await runCli(xdgConfigHome, ["help", "research"], isolatedHome),
    "research",
  );
  expectDiffHelp(
    await runCli(xdgConfigHome, ["code", "diff", "--help"], isolatedHome),
  );
  expectResolveHelp(
    await runCli(xdgConfigHome, ["resolve", "--help"], isolatedHome),
  );
}

describe("stable CLI surface regardless of the experimental setting", () => {
  it("registers research, resolve, and diff when config is absent", async () => {
    await withMissingConfig(async (xdgConfigHome, isolatedHome) => {
      await expectStableSurface(xdgConfigHome, isolatedHome);
    });
  }, 30_000);

  it("ignores empty, false, and legacy true experimental settings", async () => {
    for (const contents of [
      "",
      "[experimental]\ntools = false\n",
      "[experimental]\ntools = true\n",
    ]) {
      await withConfig(contents, async (xdgConfigHome) => {
        await expectStableSurface(xdgConfigHome);
      });
    }
  }, 60_000);

  it("reaches research auth instead of an opt-in error", async () => {
    await withConfig(
      "[experimental]\ntools = false\n",
      async (xdgConfigHome) => {
        const result = await runCli(xdgConfigHome, [
          "research",
          "npm:express",
          "How is routing implemented?",
          "--json",
        ]);
        expect(result.exitCode).toBe(1);
        expect(result.stdout).toBe("");
        expect(result.stderr).not.toContain("Experimental");
        expect(result.stderr).not.toContain("[experimental]");
      },
    );
  }, 30_000);

  it("keeps research available when the config is malformed", async () => {
    await withConfig("[experimental\n", async (xdgConfigHome) => {
      for (const args of [["--help"], ["--version"], ["doctor", "--help"]]) {
        const result = await runCli(xdgConfigHome, args);
        expect(result.exitCode).toBe(0);
      }
      expectResearchHelp(
        await runCli(xdgConfigHome, ["research", "--help"]),
        "research",
      );
      expectDiffHelp(await runCli(xdgConfigHome, ["code", "diff", "--help"]));
    });
  }, 30_000);
});
