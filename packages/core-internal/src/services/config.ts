import { z } from "zod";

/**
 * Base URL configuration for GitHits services.
 *
 * Three separate URLs are needed:
 * - MCP URL: For OAuth discovery (.well-known endpoints) and auth flow
 * - API URL: For REST API calls (search)
 * - Code navigation URL: For indexed package/source calls
 */

export const DEFAULT_MCP_URL = "https://mcp.githits.com";
export const DEFAULT_API_URL = "https://api.githits.com";
export const DEFAULT_CODE_NAV_URL = "https://oss.githits.dev";

const ENVIRONMENT_SCHEMA = z.enum(["prod", "dev"]);
export type GitHitsEnvironment = z.infer<typeof ENVIRONMENT_SCHEMA>;

export interface ServiceUrlDefaults {
  readonly mcpUrl: string;
  readonly apiUrl: string;
  readonly codeNavigationUrl: string;
}

const SERVICE_URL_DEFAULTS: Record<GitHitsEnvironment, ServiceUrlDefaults> = {
  prod: {
    mcpUrl: DEFAULT_MCP_URL,
    apiUrl: DEFAULT_API_URL,
    codeNavigationUrl: DEFAULT_CODE_NAV_URL,
  },
  dev: {
    mcpUrl: "https://mcp-dev.githits.com",
    apiUrl: "https://api-dev.githits.com",
    codeNavigationUrl: "https://oss-dev.githits.dev",
  },
};

export class ServiceUrlConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ServiceUrlConfigError";
  }
}

/** Resolve the backend preset independently of individual URL overrides. */
export function getGitHitsEnvironment(
  env: Record<string, string | undefined> = process.env,
): GitHitsEnvironment {
  const value = env.GITHITS_ENV;
  const parsed = ENVIRONMENT_SCHEMA.safeParse(
    value === undefined || value.trim() === "" ? "prod" : value,
  );
  if (!parsed.success) {
    throw new ServiceUrlConfigError("Invalid GITHITS_ENV: use prod or dev.");
  }
  return parsed.data;
}

/** Share the preset table with diagnostics without validating raw overrides. */
export function getServiceUrlDefaults(
  environment: GitHitsEnvironment,
): ServiceUrlDefaults {
  return SERVICE_URL_DEFAULTS[environment];
}

/**
 * Get the MCP server base URL (for OAuth discovery).
 * Override with GITHITS_MCP_URL environment variable.
 * @param env Supplies GITHITS_ENV and URL overrides; defaults to process.env.
 */
export function getMcpUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const defaults = getServiceUrlDefaults(getGitHitsEnvironment(env));
  return resolveServiceUrl("GITHITS_MCP_URL", defaults.mcpUrl, env);
}

/**
 * Resolve the MCP URL solely as an auth-storage namespace. This intentionally
 * skips network validation so local diagnostics and credential cleanup remain
 * available when network configuration is malformed.
 * @param env Supplies the selector and MCP override; defaults to process.env.
 */
export function getMcpStorageKeyUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  // Invalid selectors retain the production namespace for local recovery only.
  // Network getters and CLI auth fetches validate the selector before requests.
  const environment = env.GITHITS_ENV === "dev" ? "dev" : "prod";
  return env.GITHITS_MCP_URL ?? getServiceUrlDefaults(environment).mcpUrl;
}

/**
 * Get the REST API base URL (for search).
 * Override with GITHITS_API_URL environment variable.
 * @param env Supplies GITHITS_ENV and URL overrides; defaults to process.env.
 */
export function getApiUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const defaults = getServiceUrlDefaults(getGitHitsEnvironment(env));
  return resolveServiceUrl("GITHITS_API_URL", defaults.apiUrl, env);
}

/**
 * Get the OSS package/source backend URL from the preset or GITHITS_CODE_NAV_URL.
 * @param env Supplies GITHITS_ENV and URL overrides; defaults to process.env.
 */
export function getCodeNavigationUrl(
  env: Record<string, string | undefined> = process.env,
): string {
  const defaults = getServiceUrlDefaults(getGitHitsEnvironment(env));
  return resolveServiceUrl(
    "GITHITS_CODE_NAV_URL",
    defaults.codeNavigationUrl,
    env,
  );
}

/**
 * Enforce TLS for service URLs while retaining exact loopback HTTP endpoints
 * used by local development.
 */
export function validateServiceUrl(value: string, source: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new ServiceUrlConfigError(
      `Invalid ${source}: expected an HTTPS URL or an HTTP loopback URL.`,
    );
  }

  if (parsed.protocol === "https:") return value;
  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");
  const isLoopback =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  if (parsed.protocol === "http:" && isLoopback) return value;

  throw new ServiceUrlConfigError(
    `Invalid ${source}: use HTTPS. Plain HTTP is allowed only for localhost, 127.0.0.1, or [::1].`,
  );
}

function resolveServiceUrl(
  envName: string,
  defaultUrl: string,
  env: Record<string, string | undefined>,
): string {
  const override = env[envName];
  return override === undefined
    ? defaultUrl
    : validateServiceUrl(override, envName);
}

/**
 * Get API token from environment variable (for CI/automation).
 */
export function getEnvApiToken(): string | undefined {
  return process.env.GITHITS_API_TOKEN;
}
