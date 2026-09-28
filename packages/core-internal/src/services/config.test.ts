import { afterEach, describe, expect, it } from "bun:test";
import {
  DEFAULT_MCP_URL,
  getApiUrl,
  getCodeNavigationUrl,
  getGitHitsEnvironment,
  getMcpStorageKeyUrl,
  getMcpUrl,
  ServiceUrlConfigError,
} from "./config.js";

const URL_ENV_NAMES = [
  "GITHITS_ENV",
  "GITHITS_MCP_URL",
  "GITHITS_API_URL",
  "GITHITS_CODE_NAV_URL",
] as const;

describe("service URL config", () => {
  const originals = new Map<string, string | undefined>(
    URL_ENV_NAMES.map((name) => [name, process.env[name]]),
  );

  afterEach(() => {
    for (const [name, value] of originals) restoreEnv(name, value);
  });

  it("uses secure production defaults", () => {
    clearUrlEnv();

    expect(getMcpUrl()).toBe("https://mcp.githits.com");
    expect(getApiUrl()).toBe("https://api.githits.com");
    expect(getCodeNavigationUrl()).toBe("https://oss.githits.dev");
  });

  for (const { envName, getter } of URL_GETTERS) {
    it(`${envName} accepts HTTPS and exact HTTP loopback hosts`, () => {
      clearUrlEnv();
      for (const value of [
        "https://custom.githits.test/path",
        "http://localhost:4000",
        "http://127.0.0.1:4000",
        "http://[::1]:4000",
      ]) {
        process.env[envName] = value;
        expect(getter()).toBe(value);
      }
    });

    it(`${envName} rejects insecure, malformed, and blank overrides`, () => {
      clearUrlEnv();
      for (const value of [
        "http://attacker.test",
        "http://localhost.attacker.test",
        "ftp://localhost/resource",
        "not-a-url",
        "",
        "   ",
      ]) {
        process.env[envName] = value;
        expect(() => getter()).toThrow(ServiceUrlConfigError);
        expect(() => getter()).toThrow(envName);
      }
    });
  }

  it("keeps the package/source default independent from custom GitHits environments", () => {
    clearUrlEnv();
    process.env.GITHITS_MCP_URL = "https://mcp.staging.githits.test";

    expect(getCodeNavigationUrl()).toBe("https://oss.githits.dev");
  });

  it("resolves malformed MCP overrides for storage cleanup without network validation", () => {
    clearUrlEnv();
    process.env.GITHITS_MCP_URL = "http://attacker.test";

    expect(getMcpStorageKeyUrl()).toBe("http://attacker.test");
    expect(() => getMcpUrl()).toThrow("GITHITS_MCP_URL");
  });

  it("uses the production MCP URL as the default storage namespace", () => {
    clearUrlEnv();

    expect(getMcpStorageKeyUrl()).toBe(DEFAULT_MCP_URL);
  });
});

const URL_GETTERS: Array<{
  envName: (typeof URL_ENV_NAMES)[number];
  getter: (env?: Record<string, string | undefined>) => string;
}> = [
  { envName: "GITHITS_MCP_URL", getter: getMcpUrl },
  { envName: "GITHITS_API_URL", getter: getApiUrl },
  { envName: "GITHITS_CODE_NAV_URL", getter: getCodeNavigationUrl },
];

function clearUrlEnv(): void {
  for (const name of URL_ENV_NAMES) delete process.env[name];
}

function restoreEnv(name: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[name];
    return;
  }
  process.env[name] = value;
}

describe("service environment presets", () => {
  it("selects branded production defaults for unset, blank, and prod selectors", () => {
    for (const selector of [undefined, "", "   ", "prod"]) {
      const env = { GITHITS_ENV: selector };
      expect(getGitHitsEnvironment(env)).toBe("prod");
      expect(getMcpUrl(env)).toBe("https://mcp.githits.com");
      expect(getApiUrl(env)).toBe("https://api.githits.com");
      expect(getCodeNavigationUrl(env)).toBe("https://oss.githits.dev");
      expect(getMcpStorageKeyUrl(env)).toBe(DEFAULT_MCP_URL);
    }
  });

  it("selects all development endpoints and the matching auth namespace", () => {
    const env = { GITHITS_ENV: "dev" };
    expect(getGitHitsEnvironment(env)).toBe("dev");
    expect(getMcpUrl(env)).toBe("https://mcp-dev.githits.com");
    expect(getApiUrl(env)).toBe("https://api-dev.githits.com");
    expect(getCodeNavigationUrl(env)).toBe("https://oss-dev.githits.dev");
    expect(getMcpStorageKeyUrl(env)).toBe(getMcpUrl(env));
  });

  it("keeps explicit overrides independent of the selected preset", () => {
    const env = {
      GITHITS_ENV: "dev",
      GITHITS_CODE_NAV_URL: "http://localhost:4000",
    };
    expect(getCodeNavigationUrl(env)).toBe("http://localhost:4000");
    expect(getMcpUrl(env)).toBe("https://mcp-dev.githits.com");
    expect(getApiUrl(env)).toBe("https://api-dev.githits.com");
    expect(getMcpStorageKeyUrl(env)).toBe("https://mcp-dev.githits.com");
    for (const { envName, getter } of URL_GETTERS) {
      expect(
        getter({ GITHITS_ENV: "dev", [envName]: "https://custom.test" }),
      ).toBe("https://custom.test");
      expect(
        getter({ GITHITS_ENV: "prod", [envName]: "http://localhost:4000" }),
      ).toBe("http://localhost:4000");
    }
  });

  it("rejects invalid selectors before any network URL is selected", () => {
    for (const value of ["staging", "DEV", " dev ", "private-selector-value"]) {
      for (const { envName, getter } of URL_GETTERS) {
        const env = { GITHITS_ENV: value, [envName]: "https://custom.test" };
        expect(() => getter(env)).toThrow(
          "Invalid GITHITS_ENV: use prod or dev.",
        );
      }
    }
  });

  it("keeps invalid selectors usable for local auth storage recovery", () => {
    expect(getMcpStorageKeyUrl({ GITHITS_ENV: "invalid" })).toBe(
      DEFAULT_MCP_URL,
    );
    expect(
      getMcpStorageKeyUrl({
        GITHITS_ENV: "invalid",
        GITHITS_MCP_URL: "not-a-url",
      }),
    ).toBe("not-a-url");
    expect(
      getMcpStorageKeyUrl({
        GITHITS_ENV: "dev",
        GITHITS_MCP_URL: "https://custom.test",
      }),
    ).toBe("https://custom.test");
  });

  it("resolves injected environments independently without modifying them", () => {
    const dev = { GITHITS_ENV: "dev", GITHITS_MCP_URL: "https://custom.test" };
    const prod = { GITHITS_ENV: "prod" };
    expect(getMcpUrl(dev)).toBe("https://custom.test");
    expect(getMcpUrl(prod)).toBe(DEFAULT_MCP_URL);
    expect(dev).toEqual({
      GITHITS_ENV: "dev",
      GITHITS_MCP_URL: "https://custom.test",
    });
    expect(prod).toEqual({ GITHITS_ENV: "prod" });
  });
});
