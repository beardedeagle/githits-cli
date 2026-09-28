# Package-addressed repository documentation

## Status and outcome

Overall and phase 1: **IMPLEMENTED; CODE REVIEW PENDING**. Package-attributed repository documentation in
CLI/MCP search uses the same served package target and `path:lines` layout as
repository code. Generated unified-read follow-ups use that package target and
target-relative path. There is one increment; no product decisions remain.

## Verified evidence and assumptions

- Clean branch `jlitola/fix-repo-docs-path` starts at `baa325b` (also local
  `origin/main`). No implementation edits existed at planning time.
- The user's `npm:githits@0.22.1` search returns repository docs with package
  registry/name/version, `filePath`, repository metadata, and line bounds, but
  the shared renderer displays their `docsReadTarget` instead of package identity.
- Live unified reads of `docs/implementation/auth.md` lines 42-43 succeeded with
  both the emitted snapshot page ID and `target="npm:githits@0.22.1"` plus the
  separate path; both returned the same Token Lifecycle heading.
- JSON reads additionally resolved both addresses to the same exact served
  commit `3ed7535d66dbf08d7d793a6a985e999eb0276243`, with current freshness.
- Backend `priv/graphql/schema.graphql` documents `DiscoveryLocator.filePath`
  as target-relative and `repositoryFilePath` as repository-relative.
  `Query.read.target` accepts package targets with paths and emitted repository
  page IDs. Discovery has no general `read.target` object to select.
- `documentationReadLocator()` is already shared by the search header and
  generated follow-up. Semantic preferred reads already prefer package
  attribution and remain authoritative when present.
- Legacy documentation locators and repository-only hits are supported by
  existing tests; they must continue to use the emitted page locator.
- Assumption verified by schema and live input: complete package attribution
  includes registry, package name, served version, and target-relative file path.
  Incomplete legacy locators retain their current addressing.
- Missing `matchedSource` means a candidate, for code and docs alike. This fix
  does not claim compatibility/fallback windows as source matches.
- Existing repo-code JSON follow-ups without semantic preferred reads may use
  an exact repository address despite package-addressed headers. This increment
  deliberately gives package-attributed docs package-addressed follow-ups, as
  specified in the conversation before implementation was authorized; it does
  not change ordinary repo-code follow-ups or claim those already have parity.
- The earlier Flask correction documented in `unified-read.md` used an opaque
  page ID after an agent invented a combined package/path target and received
  NOT_FOUND. Current unified read accepts a separate package target and path:
  the external reviewer verified `bun src/cli.ts read 'pypi:flask@3.1.3'
  'docs/design.rst' --lines 83-93` returns the expected Werkzeug routing lines.

## Scope, boundaries, and compatibility

The existing pure documentation locator selector owns addressing preference
because both display and automatic read actions consume it. Extend its result
with optional `path`; for repository docs passing the existing
`isPackageTarget(hit)` discriminator and carrying complete registry/name/version
and `filePath`, select the served package target and `filePath`. Package metadata
alone must not rewrite a repository-target hit. No URL parsing,
new service, backend schema, query selection, or reader change is needed.
CLI-only placement would duplicate MCP policy; backend changes are unnecessary
for the verified addressing contract.

Preserve semantic preferred-read precedence, repository-only/legacy page-ID
reads, mutable hosted URL/fragment behavior, source evidence, ANSI behavior,
and structured provenance. Only the derived follow-up and text addressing
change. No credential handling, network fetching, or performance-sensitive
path changes. No optimization or benchmark claim is made.

The backend wording is confusing: `docsReadTarget` is still accepted by unified
read, and `filePath` and `repositoryFilePath` have distinct coordinate systems.
Document the current selection rule and that ambiguity permanently. Renaming or
adding backend API fields is outside this increment, not required for its fix.

## Phase 1 — consistent package-addressed docs

Dependencies: existing backend contract only. Unknowns: **none**.

1. Add regressions for the reported package docs headers and CLI/MCP follow-ups,
   including a monorepo path that differs from the repository-root path.
2. Extend `documentationReadLocator()` and the shared command builders to
   return/consume an optional exact path. Have the search renderer print the
   selected package path with its evidence range.
   MCP path-based follow-ups retain the existing 300-line maximum using
   `boundLargeReadRange()` and the hit's evidence coordinates; CLI follow-ups
   retain the full selected range. Opaque page-locator follow-ups keep their
   existing range behavior.
3. Verify incomplete legacy/repository-only locators, semantic preferred reads,
   and hosted documentation retain their existing contracts.
4. Update `docs/implementation/tools.md`, `cli-commands.md`, and
   `unified-read.md`, including an explicit note superseding the historical
   Flask presentation workaround; correct `UnifiedSearchLocator.docsReadTarget`
   in `packages/core-internal/src/services/code-navigation-service.ts` (line 377),
   which describes it as only a `docs_read` target. Add one patch fragment for
   both public artifacts.

Acceptance criteria:

- Reported docs rows start with `npm:githits@0.22.1` and the target-relative
  `docs/implementation/auth.md:42-52` / `config.md:69-79` coordinates.
- Docs JSON-derived and internal CLI follow-ups use unified read with the same pinned
  package target, exact path, and bounds; original locator fields remain intact.
- Monorepo docs use package-relative paths rather than repository-root paths.
- Repository-only and incomplete legacy docs retain callable emitted locators;
  hosted URL/fragment and semantic preferred-read regressions pass.
- Targeted shared formatter/follow-up/response, search parity, and read tests
  pass with `bun test`; typecheck, build, affected-file formatting, and source
  CLI/MCP smoke suites pass. Run the full unit suite for required review checks.
- Run one local descriptor-only `docs-search-noise` agent eval (Flask); inspect
  tool calls, final answer, metrics, and isolation violations. Report limitations
  if that workload selects only hosted docs rather than repository docs.
- Replay reads from the rendered npm:githits and Flask docs rows using their
  package target, separate path, and displayed line range.
- Internal review and one external Claude review per round are clean; push a
  stable commit and open a draft PR. No merge/release/deployment is authorized.

## Completion and cleanup

Record actual validation and review evidence here before the draft PR. Keep this
plan through review and delete it only after the increment merges, with durable
contract documentation already transferred to implementation docs. There is no
later phase requiring reorientation and no required backend handoff.

## Plan review disposition (2026-09-28)

- F1: correct the false repo-code JSON parity premise; reject the proposed switch
  to Git-SHA docs follow-ups because the user explicitly requested package
  addressing and authorized the stated package-addressed follow-up fix. A
  difference in addressing is not high impact when both resolve the same snapshot.
  No new product decision is required and code follow-ups remain out of scope.
- F2: accepted. Explicitly require `isPackageTarget()` and test repository hits
  carrying synthetic package metadata.
- F3: accepted. Document the historical Flask reversal, use the Flask noise
  workload, and replay reads from the displayed package rows.
- F4: accepted. State and test MCP bounding and unbounded CLI syntax.
- F5: accepted. Name the exact stale comment; readiness has no open decisions.

## Implementation evidence

- Plan review round 2 was clean after the recorded closures; internal pre-flight
  review of the revised plan also found no issues.
- Added six failing regression cases before production edits; all then passed.
  The resulting targeted formatter/follow-up/response/parity/read suite passed
  317 tests / 956 assertions. The full `bun test` suite passed 4,951 tests /
  17,750 assertions across 210 files. Typecheck, build, and changed-file Biome
  checks passed; implementation pre-flight review found no issues.
- Local CLI docs searches now render package-addressed githits and Flask rows.
  Reads copied from `npm:githits@0.22.1 docs/implementation/auth.md:42-52` and
  `pypi:flask@3.1.3 docs/design.rst:80-90` both returned the expected source.
- Source CLI smoke passed stable and experimental live cohorts (138 steps).
- The initial isolated Claude eval had no subscription credentials and failed
  before any tool use; that artifact is preserved. Rerunning through the
  repository-documented secure Keychain injection succeeded in 24.1 seconds.
  The `docs-search-noise` descriptor-only trace contains search, a successful
  `read(target="pypi:flask@3.1.3", path="docs/quickstart.rst", 154-230)`, and a
  successful hosted fragment read. Final self-report: success/high confidence.
  No isolation-violation file was emitted. Token/cost and logical-call metrics
  are unavailable in the Claude adapter; answer quality was not graded.
- Source MCP smoke passed (63 steps, exit 0). External code review is pending.
