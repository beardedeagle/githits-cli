import type { VersionRefRecovery } from "@githits/core-internal";
import type { MappedError, MappedErrorDetails } from "./mapped-error.js";
import { parseRepositoryTargetSpec } from "./repository-target.js";
import { shellQuoteExact } from "./shell-quote.js";

export type VersionRefActionContext =
  | { syntax: "cli"; argv: readonly string[] }
  | { syntax: "mcp"; tool: string; args: object };

/** Map decoded public facts once for all service consumers. */
export function mapVersionRefRecovery(
  message: string,
  recovery: VersionRefRecovery,
): MappedError {
  const { code, retryable, ...details } = recovery;
  return { code, message, retryable: retryable ?? false, details };
}

/** Choose the producer's first suggestion without confusing registry versions and Git refs. */
export function versionRefSuggestions(mapped: MappedError): string[] {
  const d = mapped.details;
  if (!d) return [];
  if (mapped.code === "VERSION_NOT_FOUND") {
    return d.availablePackageVersions?.length
      ? d.availablePackageVersions
      : d.availableVersions?.some((entry) => entry.version)
        ? d.availableVersions.flatMap((entry) =>
            entry.version ? [entry.version] : [],
          )
        : d.publishedVersions?.length
          ? d.publishedVersions
          : d.latestVersion
            ? [d.latestVersion]
            : [];
  }
  if (mapped.code === "REF_NOT_FOUND") {
    return (
      (d.suggestedRefs?.length
        ? d.suggestedRefs
        : d.availableRefs?.length
          ? d.availableRefs
          : d.availableVersions
      )?.map((entry) => entry.ref) ?? []
    );
  }
  return [];
}

/** Rewrite only complete identities; incomplete shapes retain the backend's useful prose. */
export function versionRefFailureText(mapped: MappedError): string | undefined {
  const d = mapped.details;
  if (!d || !versionRefSuggestions(mapped).length) return undefined;
  if (mapped.code === "VERSION_NOT_FOUND" && d.package && d.requestedVersion)
    return `Package ${d.package} has no version ${d.requestedVersion}.`;
  if (
    mapped.code === "REF_NOT_FOUND" &&
    d.repoUrl &&
    (d.requestedRef ?? d.gitRef)
  )
    return `Repository ${d.repoUrl} has no ref ${d.requestedRef ?? d.gitRef}.`;
  return undefined;
}

/** Attach native recovery syntax while retaining the original message and all JSON facts. */
export function withVersionRefRecovery(
  mapped: MappedError,
  context: VersionRefActionContext,
): MappedError {
  const suggestion = versionRefSuggestions(mapped)[0];
  if (
    !suggestion ||
    suggestion.includes("\0") ||
    !mapped.details ||
    mapped.details.action
  )
    return mapped;
  const action =
    context.syntax === "cli"
      ? cliAction(mapped, suggestion, context.argv)
      : mcpAction(mapped, suggestion, context.tool, context.args);
  return action
    ? { ...mapped, details: { ...mapped.details, action } }
    : mapped;
}

function matchesVersion(
  value: string,
  requested: string | undefined,
  pkg: string | undefined,
): boolean {
  return (
    requested !== undefined &&
    (value === requested ||
      (pkg?.startsWith("go:") === true && `v${value}` === requested))
  );
}

function replaceVersion(
  value: string,
  d: MappedErrorDetails,
  suggestion: string,
): string {
  return value
    .split("..")
    .map((part) =>
      matchesVersion(part, d.requestedVersion, d.package) ? suggestion : part,
    )
    .join("..");
}

function replaceTarget(
  value: string,
  mapped: MappedError,
  suggestion: string,
): string {
  const d = mapped.details ?? {};
  const hash = value.indexOf("#");
  const base = hash < 0 ? value : value.slice(0, hash);
  const fragment = hash < 0 ? "" : value.slice(hash);
  if (
    mapped.code === "VERSION_NOT_FOUND" &&
    d.package &&
    base.startsWith(`${d.package}@`)
  ) {
    return `${d.package}@${replaceVersion(base.slice(d.package.length + 1), d, suggestion)}${fragment}`;
  }
  if (mapped.code === "REF_NOT_FOUND" && d.repoUrl && d.requestedRef) {
    // Parse only explicit repository operands; other argv entries may be patterns or paths.
    try {
      const parsed = parseRepositoryTargetSpec(base);
      if (parsed.repoUrl === d.repoUrl && parsed.gitRef === d.requestedRef)
        return `${base.slice(0, -d.requestedRef.length)}${suggestion}${fragment}`;
    } catch {
      /* Not a repository operand. */
    }
  }
  return value;
}

// Boolean switches on the affected CLI commands; other flags consume one value.
const CLI_SWITCHES = new Set([
  "-v",
  "--verbose",
  "--json",
  "-F",
  "--fixed-strings",
  "-i",
  "--ignore-case",
  "--case-sensitive",
  "--include-withdrawn",
  "--transitive",
  "--issues",
  "--no-body",
  "--verbatim",
  "--no-transitive-security",
  "--dependency-issues",
  "--recursive",
  "--name-status",
  "--name-only",
  "--stat",
  "--patch",
]);

function positionalIndices(argv: readonly string[], start: number): number[] {
  const result: number[] = [];
  let operandsOnly = false;
  for (let i = start; i < argv.length; i++) {
    const arg = argv[i] ?? "";
    if (arg === "--" && !operandsOnly) {
      operandsOnly = true;
      continue;
    }
    if (!operandsOnly && arg.startsWith("-")) {
      if (
        !arg.includes("=") &&
        !CLI_SWITCHES.has(arg) &&
        !/^-[iFv]+$/.test(arg) &&
        !/^-[ABC]\d+$/.test(arg)
      )
        i++;
    } else result.push(i);
  }
  return result;
}

function cliAction(
  mapped: MappedError,
  suggestion: string,
  argv: readonly string[],
): string | undefined {
  const d = mapped.details ?? {};
  const next = [...argv];
  let changed = false;
  const positions = positionalIndices(
    argv,
    argv[0] === "pkg" || argv[0] === "code" ? 2 : 1,
  );
  for (let i = 0; i < next.length; i++) {
    const original = next[i] ?? "";
    const operand =
      argv[0] === "pkg"
        ? i === positions[0] || argv[i - 1] === "--package"
        : argv[0] === "read" || argv[0] === "list" || argv[0] === "code"
          ? i === positions[0]
          : argv[0] === "grep"
            ? positions.slice(1).includes(i)
            : argv[0] === "search"
              ? argv[i - 1] === "--in"
              : false;
    let replacement = operand
      ? replaceTarget(original, mapped, suggestion)
      : original;
    if (original.startsWith("--in=") || original.startsWith("--package=")) {
      const equals = original.indexOf("=");
      replacement = `${original.slice(0, equals + 1)}${replaceTarget(original.slice(equals + 1), mapped, suggestion)}`;
    }
    if (
      mapped.code === "VERSION_NOT_FOUND" &&
      (original.startsWith("--from=") || original.startsWith("--to=")) &&
      argv.some((arg) => arg.startsWith(`${d.package}@`))
    ) {
      const equals = original.indexOf("=");
      replacement = `${original.slice(0, equals + 1)}${replaceVersion(original.slice(equals + 1), d, suggestion)}`;
    }
    const previous = argv[i - 1];
    if (
      mapped.code === "REF_NOT_FOUND" &&
      original === `--git-ref=${d.requestedRef}` &&
      argv.some((arg) => arg === d.repoUrl || arg === `--repo-url=${d.repoUrl}`)
    )
      replacement = `--git-ref=${suggestion}`;
    if (
      mapped.code === "REF_NOT_FOUND" &&
      previous === "--git-ref" &&
      argv.some(
        (arg) => arg === d.repoUrl || arg === `--repo-url=${d.repoUrl}`,
      ) &&
      original === d.requestedRef
    )
      replacement = suggestion;
    if (
      mapped.code === "VERSION_NOT_FOUND" &&
      ["--from", "--to"].includes(previous ?? "") &&
      argv.some((arg) => arg.startsWith(`${d.package}@`))
    )
      replacement = replaceVersion(original, d, suggestion);
    if (
      argv[0] === "code" &&
      argv[1] === "diff" &&
      (d.side === "from" || d.side === "to") &&
      original.includes("..") &&
      (argv.indexOf("--") < 0 || i < argv.indexOf("--"))
    ) {
      const parts = original.split("..");
      if (parts.length === 2) {
        parts[d.side === "from" ? 0 : 1] = suggestion;
        replacement = parts.join("..");
      }
    }
    if (replacement !== original) {
      next[i] = replacement;
      changed = true;
    }
  }
  if (!changed) return undefined;
  const quote = (value: string): string =>
    /^[A-Za-z0-9_:@%+=,./-]+$/.test(value) && value.length > 0
      ? value
      : shellQuoteExact(value);
  return `Try: githits ${next.map(quote).join(" ")}`;
}

function mcpAction(
  mapped: MappedError,
  suggestion: string,
  tool: string,
  args: object,
): string | undefined {
  const d = mapped.details ?? {};
  const changes: string[] = [];
  const visit = (row: Record<string, unknown>, prefix: string): void => {
    if (typeof row.target === "string") {
      const next = replaceTarget(row.target, mapped, suggestion);
      if (next !== row.target)
        changes.push(`${prefix}target=${JSON.stringify(next)}`);
    }
    if (Array.isArray(row.targets))
      row.targets.forEach((target, i) => {
        if (typeof target === "string") {
          const next = replaceTarget(target, mapped, suggestion);
          if (next !== target)
            changes.push(`${prefix}targets[${i}]=${JSON.stringify(next)}`);
        } else if (target && typeof target === "object")
          visit(target as Record<string, unknown>, `${prefix}targets[${i}].`);
      });
    if (`${row.registry}:${row.package_name}` === d.package) {
      for (const key of ["current_version", "target_version"]) {
        if (
          typeof row[key] === "string" &&
          matchesVersion(row[key], d.requestedVersion, d.package)
        )
          changes.push(`${prefix}${key}=${JSON.stringify(suggestion)}`);
      }
    }
    if (Array.isArray(row.packages))
      row.packages.forEach((pkg, i) => {
        if (pkg && typeof pkg === "object")
          visit(pkg as Record<string, unknown>, `${prefix}packages[${i}].`);
      });
  };
  visit(args as Record<string, unknown>, "");
  if (tool === "code_diff" && (d.side === "from" || d.side === "to"))
    changes.push(`${d.side}=${JSON.stringify(suggestion)}`);
  return changes.length
    ? `Retry ${tool} with ${changes.join(", ")}.`
    : undefined;
}
