/** Dev-only provenance smoke through the locally built Node CLI and stdio MCP. */
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { type McpSmokeToolResult, resultText } from "@githits/mcp/smoke-test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const overrides = new Set([
  "GITHITS_API_TOKEN",
  "GITHITS_TOKEN",
  "GITHITS_AUTH_STORAGE",
  "GITHITS_MCP_URL",
  "GITHITS_API_URL",
  "GITHITS_CODE_NAV_URL",
  "GITHITS_ACCOUNTS_URL",
]);
const env: Record<string, string> = Object.fromEntries(
  Object.entries(process.env).filter(
    (entry): entry is [string, string] =>
      entry[1] !== undefined && !overrides.has(entry[0]),
  ),
);
Object.assign(env, {
  GITHITS_ENV: "dev",
  GITHITS_DISABLE_UPDATE_CHECK: "1",
  GITHITS_DISABLE_SKILL_UPDATE: "1",
  NO_COLOR: "1",
});
const entry = resolve("dist/cli.js");
const google = {
  id: "maven:google",
  name: "Google Maven",
  url: "https://dl.google.com/dl/android/maven2",
};
const central = {
  id: "maven:central",
  name: "Maven Central",
  url: "https://repo1.maven.org/maven2",
};

async function cli(args: string[]): Promise<string> {
  const child = Bun.spawn(["node", entry, ...args], {
    env,
    stdout: "pipe",
    stderr: "ignore",
  });
  const [code, stdout] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
  ]);
  assert.equal(code, 0, `Built CLI failed: ${args.join(" ")}; stderr withheld`);
  return stdout;
}

function json(text: string): Record<string, unknown> {
  const value: unknown = JSON.parse(text);
  assert(value !== null && typeof value === "object" && !Array.isArray(value));
  return value as Record<string, unknown>;
}

const client = new Client({
  name: "registry-repository-smoke",
  version: "1.0.0",
});
const transport = new StdioClientTransport({
  command: "node",
  args: [entry, "mcp", "start"],
  env,
  stderr: "ignore",
});

async function mcp(
  tool: string,
  target: string,
  format: "json" | "text",
): Promise<string> {
  const result = (await client.callTool({
    name: tool,
    arguments: { target, format },
  })) as McpSmokeToolResult;
  assert(!result.isError, `Built MCP failed: ${tool} ${target}`);
  return resultText(result, `${tool} ${target}`);
}

try {
  await client.connect(transport);
  for (const test of [
    {
      target: "maven:com.android.installreferrer:installreferrer",
      repository: google,
    },
    {
      target: "maven:com.google.android.gms:play-services-ads-api",
      repository: google,
    },
    { target: "maven:org.jetbrains.kotlin:kotlin-stdlib", repository: central },
    { target: "npm:express", repository: undefined },
  ]) {
    const cliJson = json(await cli(["pkg", "info", test.target, "--json"]));
    const mcpJson = json(await mcp("pkg_info", test.target, "json"));
    for (const value of [cliJson, mcpJson]) {
      assert.equal(typeof value.version, "string");
      assert.deepEqual(value.registryRepository, test.repository);
      if (!test.repository) assert(!Object.hasOwn(value, "registryRepository"));
    }
    assert.equal(cliJson.version, mcpJson.version);
    for (const text of [
      await cli(["pkg", "info", test.target]),
      await mcp("pkg_info", test.target, "text"),
    ]) {
      assert(text.includes("Vulnerabilities"));
      assert(text.includes("History:"));
      if (test.repository) {
        assert(text.includes("Package registry"));
        assert(text.includes(test.repository.name));
        assert(text.includes(test.repository.url));
      } else {
        assert(!text.includes("Package registry"));
      }
    }
    console.log(
      JSON.stringify({
        surfaces: "built CLI + MCP text/JSON",
        target: test.target,
        version: cliJson.version,
        registryRepository: cliJson.registryRepository ?? null,
      }),
    );
  }
  for (const test of [
    {
      target: "maven:com.android.installreferrer:installreferrer@2.2",
      repository: google,
      version: "2.2",
    },
    {
      target: "maven:org.jetbrains.kotlin:kotlin-stdlib@2.1.0",
      repository: central,
      version: "2.1.0",
    },
  ]) {
    for (const kind of ["deps", "vulns"]) {
      const cliJson = json(await cli(["pkg", kind, test.target, "--json"]));
      const mcpJson = json(await mcp(`pkg_${kind}`, test.target, "json"));
      for (const value of [cliJson, mcpJson]) {
        assert.equal(value.version, test.version);
        assert.deepEqual(value.registryRepository, test.repository);
      }
      console.log(
        JSON.stringify({
          surfaces: `built CLI + MCP ${kind} JSON`,
          target: test.target,
          version: test.version,
          registryRepository: test.repository,
        }),
      );
    }
  }
  console.log("Built CLI/MCP dev registry repository smoke passed");
} finally {
  await client.close();
}
