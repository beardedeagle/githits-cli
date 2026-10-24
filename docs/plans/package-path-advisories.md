# Unified grep package-path advisories

Status: compact UX revision implemented and internally reviewed clean. Local
validation passed; external review unavailable (Claude quota).

## Outcome and scope

CLI/MCP agents receive one compact warning per distinct backend path correction
in both text and JSON. Preserve native results, failures, preparation, cursors
and exact query scope. No local diagnosis, path probing, request rewrites or
retries. No infrastructure, new options, merge, release, publish or deploy.

User feedback supersedes the original verbose text and advisory-object JSON:

```text
Warning: Path is prefixed with package path "drizzle-orm". Did you mean "src/pg-core"?
```

## Verified state and dependencies

- Based on main `0a97eb12a15dca43b8c802256597db42a96c8a35`; draft PR #516
  includes initial adoption commits `e7b880d` and `b7866df`.
- Core selects/validates all `pathWarnings` fields. Shared projection reparses;
  CLI/MCP already share the text formatter. Short waits return the backend page
  directly, without a separate conversion that could drop warnings.
- Backend #3550 merged at `b26172c5fc97287256e55d22bc64aa384297184c`.
  Production initially rejected `pathWarnings`. Recheck at 2026-10-24 10:25 UTC
  accepted all fields; the original prefix request returned a warning with zero
  hits and COMPLETE. The backend deployment prerequisite is satisfied.
- Client releases are still required. Hosted clients additionally require a
  published MCP package upgrade/deployment by remote-mcp, separately authorized.

## Ownership and implementation

Core owns backend metadata and its validation. The shared response projection
owns frontend JSON; its `GrepResponse` retains result data but changes
`pathWarnings` to `string[]`. The existing shared text formatter continues to
accept core results and uses the same compact summary function. CLI/MCP both
call projection validation before formatting their raw service result.

The summary uses `repositorySubpath` and the backend suggestion for the same
`target`; it never strips a prefix or guesses a correction. If that suggestion
is absent, omit the question. Quote path values with JSON quoting; text escapes
controls and leaves each warning on one physical line. Deduplicate identical
sentences. Neither frontend format dumps backend messages or alternative pairs.
The public core service types retain complete evidence for service consumers.

Assumptions: backend owns diagnosis; suggestions are possibilities, not verified
paths. Both are established by the backend contract and read-only guide.
Unknowns/product decisions: none. No performance claim or runtime optimization.

## Phase 1 — compact advisories survive every result shape (IMPLEMENTED)

Expected outcome: one useful warning per correction across text/JSON and CLI/MCP,
including zero-hit, failure, mixed pending and pending-only results.
Dependencies and assumptions: as above. Product decisions: none.

Acceptance:
- Core rejects missing/malformed warning fields in compact/detailed modes.
- Projection copies all result data and exposes only compact warning strings.
- Text/JSON warnings agree, without verbose messages or alternative pairs.
- Duplicate warnings collapse; distinct warnings survive. Unusual path values
  remain unambiguous; text contains no active terminal controls or wrapped lines.
- Native failures, hits, preparation, cursors and request controls remain intact.
- Relevant tests, required smoke modes, build/type/format/lint/package checks,
  targeted agent eval and the repository review workflow complete.

## Validation and review

Initial adoption evidence: 6,679 unit tests passed; 182 focused tests passed.
CI at b7866df passed Linux/Windows tests, Build & Checks, MCP package validation,
and Bun/Node 20–26 compatibility. Built Node CLI/MCP dev qualification passed
prefix/exact text/JSON with the native exact failure preserved. The initial
agent eval used one original-scope grep and reported the advisory without
executing alternatives; final inconclusive/high confidence, no isolation issues
or graded quality claim.

Default source and built smoke modes passed unauthenticated. Full authenticated
smoke stops before grep on an existing recovery fixture: Go docker v20.10.0 now
resolves v20.10.0+incompatible instead of failing. A missing version supplies no
alternatives, so it cannot replace that fixture's recovery contract. No failure
assertion is weakened. The affected grep path is qualified independently.

Compact revision: eight new warning tests cover summary-only projection,
non-aliasing, deduplication, no same-target suggestion, one-line output at narrow
widths, control escaping, and independent native failures/results. Existing
CLI/MCP parity covers zero-hit, mixed pending and pending-only pages without
rewrites. Compact tests failed on all seven original cases before implementation.
Internal compact-plan review: direction sound, no findings.

Required external Claude Opus 5.5 previously hit its account usage limit before
a settled report; dispatch fenced and terminal closed. No external clean round
is claimed. Apply the review workflow to this revision and record actual checks.

## Delivery and cleanup

Update draft PR #516 with compact behavior and exact verification. Keep durable
contract/rollout knowledge in docs/implementation/unified-grep.md. After clean
external review, delete this plan in a final commit of this PR. If review remains
unavailable, retain it and report that gate. The backend backlog's client-adoption
entry needs its owner's closure after shipping; do not edit that worktree.
No unrelated implementation, new infrastructure or refactoring is deferred.

Compact revision validation completed:
- `bun test`: 6,681 passed / 0 failed, 258 files, 26,896 expectations (27.15 s).
- Eight focused grep suites after final DEL/C1 fix: 184 passed / 0 failed,
  1,359 expectations. Regression first failed both text/JSON control cases.
- Internal implementation review found DEL/C1 were escaped only in text.
  Moved that escaping into the shared summary, checked root/correction and both
  consumers, and asserted parsed-JSON/text equality. Full re-review clean.
- Typecheck/format and changed-file checks pass; lint has the same 19 warnings
  in unchanged repository-target.ts. Fresh root/MCP builds and outside-alias
  package validation pass via validate:packages:mcp-publish; publication dry-run
  skipped because MCP 0.35.0 is already published.
- Default source smoke suites pass unauthenticated (live cohorts AUTH_REQUIRED);
  built CLI/MCP smoke modes pass. Built dev CLI/MCP prefix/exact text+JSON
  qualification passes with one compact sentence and native exact error intact.
- Local/dev agent eval completes in 20.5 s: quick_start once, same-scope grep
  twice (text then JSON), no alternative executed; final inconclusive/high
  confidence. Calls/final/metrics/report inspected; no isolation issues recorded,
  no graded quality claim. Artifacts .agent-eval/package-path-compact.
- External Opus 5.5 review retried on this revision, again blocked by account
  usage limit before a report. Dispatch ctx_56d2271550a5 fenced and terminal
  closed. Plan retained for the required clean external round.
