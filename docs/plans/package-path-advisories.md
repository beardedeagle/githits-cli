# Unified grep package-path advisories

Status: IMPLEMENTED; internal implementation review clean after one test fix.
External plan/implementation clean review unavailable: required Claude Opus 5.5 hit account usage limit before a
settled report; dispatch fenced, no external clean round claimed.

## Outcome and verified evidence

CLI and MCP agents receive backend-authored package-path advisories in shared
text and lossless JSON, including empty and partial/pending pages. No client
heuristics, alternative queries, request rewrites, retries or scope changes.

Current main is `0a97eb12a15dca43b8c802256597db42a96c8a35` (2026-10-24).
Core `grep-service.ts` neither selects nor validates `pathWarnings`;
`projectGrepResult` reparses using that allowlist; both frontends already use
that projection and `formatGrepText`. Short waits have no separate client page
conversion: the service returns the validated backend result directly.

Backend PR #3550 merged at `b26172c5fc97287256e55d22bc64aa384297184c`.
Read-only skipped-selection GraphQL validation on 2026-10-24 accepted all fields
at `https://oss-dev.githits.dev/api/graphql` and rejected `pathWarnings` at
`https://oss.githits.dev/api/graphql`. Introspection is disabled at both.
Production backend availability is a release prerequisite, not assumed.

## Scope, ownership and target architecture

Core owns the typed wire contract and schema validation. Add required
`pathWarnings` with `requestedInputIndices`, `target`, `path`,
`repositorySubpath`, `message`, `suggestions { target path }` in both compact
and detailed selections; public MCP client exports expose the new types.
The existing shared grep formatter owns presentation for both frontends; a
second frontend renderer would duplicate policy. Render each backend message
once, followed by exact, unverified suggested pairs. Keep copyable pair rows
unwrapped and shell-quote CLI values / JSON-quote MCP values. Do not repeat a
separate diagnostic target/path sentence already contained in the message.
Warnings are independent of coverage, native public messages and preparation.
Preserve every match, target, index, failure, cursor and pending entry.

No schema fallback, new infrastructure, descriptor/skill changes, backend edits,
merge, release, publication or deployment. No optimization claim or benchmark
needed: this adds response metadata and bounded rendering only.

## Assumptions, unknowns and dependencies

- Backend owns diagnosis and alternatives; suggestions are unverified (public
  contract and durable backend guide verified read-only).
- Required non-null warning arrays are validated, including empty arrays; no
  compatibility guess for an old backend.
- Public providers must supply the required array; tests/fixtures will follow it.
- Deployment state can change; revalidate production support before release.
- Unknowns/product decisions: none for implementation. Live dev authentication
  and native advisory availability must be measured during qualification; any
  limitation is reported precisely and does not justify fabricated evidence.
- Dependency: current schema on dev; production deployment before client release.

## Phase 1 — advisories survive every client result shape (IMPLEMENTED; external review blocked)

Expected outcome: backend warnings remain usable alongside real results and
preparation/failure evidence across CLI and MCP, with no query behavior changes.
Assumptions/unknowns/dependencies: as above; no unresolved product decisions.

1. Add core warning/suggestion interfaces, required schema array, full selection
   and public client exports. Update existing response fixtures for the contract.
2. Add shared advisory rendering after coverage/preparation and before matches.
   Keep native message prose safe, suggestions exact and syntax-specific, and
   state that callers must retain selector kind and other search controls.
3. Add parser tests in both modes (complete field selection, malformed/missing
   fields, empty warnings, no request rewrites); projection deep-copy tests;
   renderer tests for zero hits, hits, real failures, multiple warnings/indices,
   SHA targets, spaces/quotes/metacharacters/controls and unwrapped pairs.
4. Extend CLI/MCP parity for mixed and pending-only short-wait responses, text
   and JSON, preserving controls and every advisory. Add smoke contract coverage.
5. Update `docs/implementation/unified-grep.md` with response/display ownership
   and deployment/release prerequisites; add independent changes fragment.

Acceptance/verification:
- Focused `bun test` for grep service, response, text, CLI/MCP and parity suites;
  then full `bun test`, typecheck, formatting, lint, build and public-package
  validation using repository commands.
- `GITHITS_ENV=dev bun run smoke:cli` and `smoke:mcp`; authenticated affected
  CLI/MCP qualification if credentials are available, otherwise secret-free
  auth/registration smoke and explicit limitation.
- Targeted `bun run agent:e2e` against local MCP/dev for grep behavior; inspect
  actual tool calls, final answer/confidence, metrics and isolation artifacts.
- Internal pre-flight and one external Claude reviewer per round, until clean
  or workflow limit, with valid findings fixed and evidence recorded.

## Delivery and cleanup

After clean implementation review, migrate durable knowledge and actual
validation results into implementation docs, then delete this plan in a final
commit within the same PR. Any major deferred work belongs in the backlog.
Push a reviewed draft PR with exact check results and rollout prerequisites.
Report that the backend backlog entry needs its owner's cross-repository
closure; do not edit that worktree. No new refactoring is currently needed.


## Actual validation and review record

- Baseline focused suites: 169 pass. New core regression tests failed four cases
  before implementation, proving absent selection/retention/validation.
- `bun test`: 6,679 pass, 0 fail across 258 files (27.05 s).
- Focused eight grep suites: 182 pass, 0 fail, 1,354 expectations after platform/control quoting fixes.
- `bun run typecheck`, `bun run format:check`, root build and MCP build pass.
  `bun run lint` passes with 19 preexisting warnings confined to unchanged
  `packages/mcp/src/shared/repository-target.ts`.
- `bun run validate:packages:mcp-publish` passes, including packed consumers
  outside workspace aliases. npm publish dry-run skipped because current
  `@githits/mcp@0.35.0` is already published; no version bump/publication attempted.
- Default `bun run smoke:cli` and `bun run smoke:mcp` pass with credentials
  absent and file auth selected (live cohorts explicitly skipped AUTH_REQUIRED).
  Source CLI unauthenticated and MCP registration smoke pass; built equivalents
  `smoke:cli:built` and `smoke:mcp:built` pass. Initial built-smoke launch raced
  package validator's own build cleanup; rerunning after validation finished
  passed. No product failure or cleanup change was needed.
- Default live smoke first stopped on inaccessible keychain under isolated HOME.
  Reproduced normal dev `pkg info` success vs scoped-HOME keychain error. Passing
  the existing token provider's credential only through child-process memory
  resolved authentication, then both full live suites stopped on the existing Go
  recovery probe. Its requested `v20.10.0` now succeeds as `v20.10.0+incompatible`.
  A nonexistent version failed but offered no alternatives, so it cannot replace
  this probe's recovery contract. No unrelated assertion was weakened.
- Built Node dev CLI/MCP affected qualification passed prefix + exact text/JSON,
  matching all warnings/hits/statuses/cursor/traversal; exact retained native
  `GREP_PATH_NOT_INDEXED`. Local evidence: `/tmp/package-path-live-results/`.
- `GITHITS_ENV=dev CODEX_HOME=/Users/jpl/.codex-eval bun run agent:e2e --agent
  codex --surface mcp --server local --workload
  eval/agentic/probes/package-path-advisories.md --out
  .agent-eval/package-path-advisories` passed harness validation (14.8 s).
  URL overrides were removed for coherent dev endpoints. Inspected actual
  tool-calls/final/metrics/report: one grep preserved prefix, advisory recognized,
  alternatives unexecuted; final inconclusive/high confidence, no recorded
  isolation violations. No graded quality claim.
- Internal code review round 1: direction sound; fix unconditional Bash replay
  on Windows. Closure: retained quote-structure assertions on every platform,
  gated only Bash execution, inspected related new tests; focused six tests pass
  with 34 expectations. Internal round 2: clean, no findings.
- Required external Claude Opus 5.5 hit an account usage limit during plan review
  before reporting. Dispatch `ctx_bec274ae3118` was fenced and its reviewer
  terminal closed. No substitute model, no external clean round claimed.

## Remaining gates and lifecycle

Implementation and internal review are complete. The draft must state external
review unavailable and full live smoke blocked by the existing recovery probe.
A clean external review is still required by the repository workflow; retain
this plan for that review. Once clean, delete it in the final commit of this PR,
keeping durable contract, rollout and qualification facts in unified-grep.md.
Production backend deployment and subsequent CLI/MCP releases remain external
prerequisites, not authorized operations. No other implementation is deferred,
and no new refactoring opportunity or infrastructure is needed for this change.

Final self-check found that JSON.stringify leaves C1 controls literal even
though selector normalization permits them. Added C1 to the pair round-trip
regression (failed in MCP mode before the fix), and reused the formatter's
existing escapeControls for JSON pair rows; no new boundary or helper. CLI
already uses shellQuoteExact for those controls. Checked all new advisory rows:
prose uses existing escaping, CLI rows use shell quoting, MCP rows now escape
C0/C1 while JSON.parse retains the exact value. Initial PR CI at e7b880d passed
Linux/Windows tests, Build & Checks, MCP package validation and Bun/Node 20–26
compatibility. Follow-up quoting fix: final internal review clean, focused suites pass,
public package validation (including fresh root/MCP builds) passes.
