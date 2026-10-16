import { z } from "zod";

/** Nullable registry-version association carried by public error inventories. */
export interface RecoveryRef {
  ref: string;
  version?: string | null;
}

/** Public recovery facts; registry releases and indexed snapshots stay distinct. */
export interface VersionRefRecovery {
  code: "VERSION_NOT_FOUND" | "REF_NOT_FOUND";
  retryable?: boolean;
  package?: string;
  requestedVersion?: string;
  requestedRef?: string;
  repoUrl?: string;
  latestVersion?: string;
  latestIndexed?: string;
  availablePackageVersions?: string[];
  availableVersions?: RecoveryRef[];
  availableRefs?: RecoveryRef[];
  suggestedRefs?: RecoveryRef[];
  inputPath?: (string | number)[];
  targetIndex?: number;
  targetCount?: number;
}

const text = z.string().refine((value) => value.trim().length > 0);
const versions = z.array(z.string().min(1));
const refs = z.array(
  z.object({
    ref: z.string().min(1),
    version: z.string().nullable().optional(),
  }),
);

/** Decode known recovery codes without relying on message wording or rejecting new fields. */
export function parseVersionRefRecovery(
  extensions: Record<string, unknown> | undefined,
): VersionRefRecovery | undefined {
  const code = extensions?.code;
  if (code !== "VERSION_NOT_FOUND" && code !== "REF_NOT_FOUND")
    return undefined;
  const result: VersionRefRecovery = { code };
  if (typeof extensions?.retryable === "boolean")
    result.retryable = extensions.retryable;
  for (const [wire, key] of [
    ["package", "package"],
    ["requested_version", "requestedVersion"],
    ["git_ref", "requestedRef"],
    ["repo_url", "repoUrl"],
    ["latest_version", "latestVersion"],
    ["latest_indexed", "latestIndexed"],
  ] as const) {
    const raw =
      extensions?.[wire] ??
      (wire === "repo_url"
        ? extensions?.repoUrl
        : wire === "git_ref"
          ? extensions?.gitRef
          : undefined);
    const parsed = text.safeParse(raw);
    if (parsed.success) result[key] = parsed.data;
  }
  const published = versions.safeParse(extensions?.available_package_versions);
  if (published.success) result.availablePackageVersions = published.data;
  for (const [wire, key] of [
    ["available_versions", "availableVersions"],
    ["available_refs", "availableRefs"],
    ["suggested_refs", "suggestedRefs"],
  ] as const) {
    const parsed = refs.safeParse(extensions?.[wire] ?? extensions?.[key]);
    if (parsed.success) result[key] = parsed.data;
  }
  const path = z
    .array(z.union([z.string(), z.number().int().nonnegative()]))
    .safeParse(extensions?.input_path);
  if (path.success) result.inputPath = path.data;
  for (const [wire, key] of [
    ["target_index", "targetIndex"],
    ["target_count", "targetCount"],
  ] as const) {
    const parsed = z.number().int().nonnegative().safeParse(extensions?.[wire]);
    if (parsed.success) result[key] = parsed.data;
  }
  return result;
}
