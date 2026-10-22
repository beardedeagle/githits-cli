import { EXTERNAL_CONTENT_POSTURE } from "../tools/guardrails.js";

/**
 * Shared guide: cross-tool workflow and conventions that no single tool
 * description owns. Selected descriptions and schemas own call mechanics.
 *
 * The Research section wraps RESEARCH_VERIFIED_ANSWER_GUIDANCE as prose; tests
 * keep its whitespace-normalized text identical to the shared constant.
 */
const GUIDE = `# GitHits

GitHits answers questions about open-source code, documentation, and packages.
Inputs leave this machine: never send private code, local paths, credentials,
or personal data. This guide is both the \`githits-mcp\` skill and the
\`quick_start\` result; once either is loaded, do not call \`quick_start\`.

## Choose a tool

Match the question, then discover that tool and read its schema before calling.

| Question | Tool |
| --- | --- |
| Identify the package, repository, or docs site for an OSS dependency | \`resolve_target\` |
| Find a known regex or literal in source or documentation | \`grep\` |
| Find relevant source, symbols, tests, or documentation for a topic | \`search\` |
| Browse files or documentation pages in a known package, repository, or site | \`list\` |
| Read a source file, code symbol, or documentation section | \`read\` |
| Assess a package's license, adoption, maintenance, or overall health | \`pkg_info\` |
| Inspect vulnerabilities in a package or version | \`pkg_vulns\` |
| Inspect direct dependencies or transitive footprint | \`pkg_deps\` |
| Find release notes and changelog history for a package | \`pkg_changelog\` |
| Compare raw source across package versions or repository refs | \`code_diff\` |
| Compare current and target dependency versions for an upgrade | \`pkg_upgrade_review\` |
| Find code examples from projects across open source | \`get_example\` |
| Answer a question about an OSS package or repository with sources | \`research\` |
| Check progress of an earlier search reference | \`search_status\` |

## Dependency upgrades

Required local checks, beyond package evidence from \`pkg_upgrade_review\`,
\`pkg_changelog\`, or \`code_diff\`:

1. Preserve original code and lockfile. Before upgrading, write and run extra
   checks for affected APIs and stored data, including untested paths and
   omitted or null inputs. Save complete responses and side effects as a
   baseline.
2. Run the same cases with upgraded dependencies. Compare status codes,
   response bodies, stored values, and side effects against the baseline;
   fix unintended differences.

Passing existing tests does not prove compatibility. Report comparisons and
unverified paths.

## Workflow

1. Target: use a known canonical target directly. For a bare name, call
   \`resolve_target\` and follow its continuation rules; never auto-select an
   ambiguous candidate.
2. Locate: \`search\` by topic, \`grep\` for exact text, \`list\` for structure
   or an exact path. Hosted docs are a separate \`site:\` target that listing a
   package does not discover: search the package with \`source:"docs"\`, then
   reuse the \`site:\` target or page URL from a \`[docs page]\` hit.
3. Read: use snippets when sufficient; otherwise \`read\` focused lines at the
   returned locators. \`read\` never lists directories.
4. Combine: support behavioral claims with source, tests, or call sites; add
   \`get_example\` evidence for comparisons and cross-project patterns.

## Targets

- Packages: \`<registry>:<name>@version\` such as \`npm:express\` or
  \`pypi:requests@2.32.3\` (never the literal \`registry:\`); Swift
  \`swift:github.com/<owner>/<repo>\`, Zig \`zig:gh/<owner>/<repo>\`. A package target covers its package subpath,
  including in monorepos. Paths and path filters are relative to that package root.
- Repositories: \`github:owner/repo@ref\`, \`codeberg:\`, \`gitlab:\`, \`launchpad:\`, or a
  supported full URL, for whole repositories or sibling packages. Never infer
  a provider. Paths and path filters are relative to the repository root.
  Launchpad accepts \`lp:project\`, \`lp:distro/+source/source\`,
  \`lp:~owner/project\`, \`lp:~owner/distro/+source/source\`, and complete
  \`launchpad:~owner/[project/]+git/repo\` or
  \`launchpad:~owner/distro/+source/source/+git/repo\` paths. Case-insensitive
  \`lp:\` aliases \`launchpad:\`. HTTPS \`code.launchpad.net\`/\`git.launchpad.net\`
  URLs accept the same paths; follow returned owner-qualified targets for replay.
- Docs sites: \`site:host[/path]\`. Research takes the project's package or
  repository instead; it covers code and docs.
- Omit the suffix for the latest package version or default branch. A ref may
  be a branch, tag, or commit and may contain later \`@\`; \`#\` selects a
  symbol or heading, never a revision.

## Results

- Omit \`format\`: text serves model reading and follow-ups. Use JSON only when
  code consumes the raw response or a required field is missing from text;
  calling through MCP or code is not a reason.
- Reuse returned target/path pairs, locators, references, and ranges unchanged;
  never invent them or combine a path from one target with another target.
- Follow rendered continuation and recovery actions instead of repeating or
  polling calls. Counts cover one page.
- Omit \`wait_timeout_ms\` for the default; \`0\` returns without waiting. While
  indexing, use the displayed estimate to wait longer or pick a listed
  already-indexed version or ref. Keep the original target and path filters
  when retrying the same scope.
- Cite tool-owned provenance, including example source repositories, and
  report coverage, truncation, and other evidence limits.

## Research

Inputs are sent to GitHits. Never send credentials, personal data, private or
proprietary content, local paths, or private targets.

\`research\` researches a public repository or package to answer a question
with sources. Omit \`target\` and \`thread_id\` for question-only lookup. For
candidates, retry with the one matching the question's project as
\`target\`. Reuse a returned \`thread_id\` for follow-ups. Change project, version, or topic in the
follow-up question. Returns a verified answer that always includes its sources,
so ask the question directly without requesting citations, an overview or a
source-cited answer. Cite those sources directly; read one only when the answer
lacks a detail you need. Sources default to MCP read calls; use
\`source_format:"url"\` for original upstream URLs. Do not invent or rewrite
sources.`;

/**
 * Build the guide returned by `quick_start` and published as the skill body.
 */
export interface BuildMcpQuickStartOptions {
  /**
   * Include the external-content posture (shared guardrail block).
   * Defaults to `true` — production always wants it. The eval mock
   * MCP server passes `false` so it can compare baseline (no
   * guardrail) vs guardrailed instructions cleanly.
   */
  includeExternalContentPosture?: boolean;
}

/** @deprecated Use `BuildMcpQuickStartOptions`; retained for API compatibility. */
export type BuildMcpInstructionsOptions = BuildMcpQuickStartOptions;

export function buildMcpQuickStart(
  options: BuildMcpQuickStartOptions = {},
): string {
  const includeExternalContentPosture =
    options.includeExternalContentPosture ?? true;
  return includeExternalContentPosture
    ? `${GUIDE}\n\n${EXTERNAL_CONTENT_POSTURE}`
    : GUIDE;
}

/**
 * @deprecated Use `buildMcpQuickStart`. GitHits no longer publishes MCP
 * initialize instructions because clients expose them inconsistently.
 */
export function buildMcpInstructions(
  options: BuildMcpInstructionsOptions = {},
): string {
  return buildMcpQuickStart(options);
}

/** Guidance a local-only experimental tool adds to the local quick-start guide. */
export interface LocalExperimentalToolGuidance {
  name: string;
  /** One Markdown bullet with the tool's routing and contract. */
  guidance: string;
}

export interface BuildLocalMcpQuickStartOptions {
  enabledExperimentalTools: readonly LocalExperimentalToolGuidance[];
}

/** @deprecated Use `BuildLocalMcpQuickStartOptions`. */
export type BuildLocalMcpInstructionsOptions = BuildLocalMcpQuickStartOptions;

const LOCAL_EXPERIMENTAL_HEADING = "## Local experimental tools";

const LOCAL_EXPERIMENTAL_PRIVACY =
  "Inputs are sent to GitHits. Never send credentials, personal data, private or proprietary content, local paths, or private targets.";

/**
 * Compose local-only experimental guidance without changing the public
 * `buildMcpQuickStart()` output or public package surface. With no enabled
 * experimental tools the result is exactly the public guide.
 */
export function buildLocalMcpQuickStart(
  options: BuildLocalMcpQuickStartOptions,
): string {
  if (options.enabledExperimentalTools.length === 0)
    return buildMcpQuickStart();

  const guidance = [
    LOCAL_EXPERIMENTAL_HEADING,
    LOCAL_EXPERIMENTAL_PRIVACY,
    options.enabledExperimentalTools.map((tool) => tool.guidance).join("\n"),
  ];
  return `${buildMcpQuickStart()}\n\n${guidance.join("\n\n")}`;
}

/** @deprecated Use `buildLocalMcpQuickStart`. */
export function buildLocalMcpInstructions(
  options: BuildLocalMcpInstructionsOptions,
): string {
  return buildLocalMcpQuickStart(options);
}
