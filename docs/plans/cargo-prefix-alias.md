# Plan: Cargo input alias for crates.io

## Overall contract

Status: IMPLEMENTING (plan reviewed clean). Outcome: CLI and public MCP accept `cargo:` wherever
`crates:` addresses a package, and structured registry inputs accept `cargo`.
Canonical types, lists, enum values and constructed actions remain `crates` /
`CRATES`. This task ends with a reviewed, tested draft PR, never a merge, release,
publication, deployment, or another repository edit.

Assumptions: the user-approved contract in `/tmp/cargo-cli-handoff.md` governs;
backend PR #3424 merged as `1eb8b98768c362668cac0bccaeca513dd388b012` (handoff
evidence, deployment unproven). No open product decisions. Dependencies: existing
core registry module and MCP shared builders; deployed backend alias admission is
a publication gate, not a draft-PR gate. Unknown: actual dev deployment availability,
to be measured with safe CLI source calls during verification; no fallback if absent.

## Verified current state (2026-10-19)

- Fetched origin/main here; branch `jlitola/cargo-prefix-alias` is clean and at
  `635b9c316ccffbbd6355e615c1917602639b4306`. Rebase reported up to date.
  The handoff's stale shared-clone warning no longer applies to this worktree.
- Core `packages/core-internal/src/shared/pkgseer-registry.ts` owns strict canonical
  guards, taxonomy and enum conversion. Root index uses wildcard exports; browser
  entrypoint has explicit exports. No `cargo` canonical type or enum exists.
- MCP `shared/package-spec.ts` owns compact grammar. Navigation, unified search,
  changelog and diff share it. Six structured builders independently trim/lowercase
  then guard: summary, dependencies, vulnerabilities, upgrade review, list package
  docs, and resolve registry filters. Resolver deduplicates mapped enum values.
- Existing summary/dependency/vulnerability/resolve tests use `cargo` as an unknown
  registry fixture. This contradicts the new approved behavior by design: replace
  those rejection fixtures with a truly unknown spelling, retain rejection coverage.
- `unified-search-presentation.ts` has two canonical-guard prefix classifiers that
  miss retained alias labels; constructed package recovery uses package parsing.
  `src/commands/code/files.ts` builds a registry-list regex for conflicting inputs,
  including malformed package-looking inputs. Transparent read/list/grep builders
  forward strings; they must retain that behavior.
- Baseline: 170 tests passed across core registry, package-spec and the six structured
  request-builder test files. A dev transparent-list probe using default storage
  returned no output and was stopped; the same safe source call with explicit
  `GITHITS_AUTH_STORAGE=file` returned `AUTH_REQUIRED`. Dev deployment remains
  unverified; no auth material was read or copied.
- AGENTS and architecture/testing/review/documentation guidelines were read.
  Tests use Bun and interface mocks; builds and external-package validation are
  required. No network fields/selections need changing. No performance claim.

## Architecture and scope

Registry spelling naturally belongs to existing core registry code: add pure
`parsePkgseerRegistryArg(value: string): PkgseerRegistryArg | undefined`, trimming
and lowercasing input and returning `crates` for `cargo`, otherwise strict canonical
admission. Trimming applies to the registry segment in compact specs too: inputs
like `crates :serde` and `cargo\t:serde` now normalize their prefix, matching the
backend spelling parser; pin this acceptance with a test. Package names/versions
remain untouched. Keep both canonical type guards strict. Export via root and browser.
Adapters keep existing error types and messages, using the parser before enum or
capability checks. Package-spec owns address grammar, preserving name/version and
range rules; do not duplicate parsing in transparent builders. Prefix-only checks
in presentation and code-files use the same spelling parser so malformed package
positionals still trigger existing conflicts. No new registry/prefix list.

Scope: shared normalization, tests, short help/target alias notes, durable docs,
and one changes fragment (`githits`: minor; `@githits/mcp`: minor; additive input).
Examples/lists remain canonical; tool first sentences remain unchanged. README,
CLI pkg/code help, existing cli-commands.md (including its prefix guard explanation),
and tools.md where it describes target grammar suffice: stable quick_start/public Agent
Skills remain unchanged in this increment, so no generated assets are edited.
Non-goals: golang/swiftpm client aliases, alternate Cargo registries, PURL parsing,
name/version changes, backend GraphQL enum changes, network queries/selections,
new dependencies/infrastructure, hosted server code, broad evals or benchmarks.

Compatibility/security: aliases normalize before canonical consumers; raw labels
may remain cargo. Preserve npm scopes, Maven colons, repo/site/HTTP/opaque targets,
unknown-prefix rejection and existing error envelopes. Never print credentials,
read token/keychain stores, dump env or process arguments. Dev calls use
`GITHITS_ENV=dev` with unintended endpoint overrides removed without printing them.
No production queries. Existing factory DI remains unchanged; no container work.
Rollback is reverting this client delta; coordinate any backend admission removal
only after clients that transparently forward alias strings have rolled back.

## Phase map

1. CLI/public MCP alias behavior and delivery — IMPLEMENTING. One increment;
   expected outcome is the full local client contract below through a draft PR.
2. Hosted adoption — OUTSIDE THIS HANDOFF, BLOCKED on separately approved release
   and handoff. Outcome is published-package adoption plus separately approved
   deployment and authenticated hosted parity, never duplicate alias logic.

### Phase 1: next increment

Assumptions: verified boundaries above; no product decisions. Dependencies: none
for implementation; credentials and dev deployment for live evidence. Unknown:
dev alias availability. Missing live access is reported as a publication gate.

Ordered implementation sequence (one Luna worker, dispatch sequentially):
1. Core spelling parser + core tests + browser export (one concern).
2. Package-spec admission + grammar tests (one concern).
3. Apply the decided admission substitution across the six structured builders and
   adjacent tests: summary, dependencies, vulnerabilities, upgrade review, list
   package docs, resolve filters (one mechanical normalization concern, no policy
   redesign). Prove each builder yields its canonical baseline; resolver dedup
   occurs after enum mapping as today.
Coordinator keeps judgment-heavy presentation/code-files integration, inheritance,
wire/parity/transparent-forwarding tests, docs, live checks and delivery. Each worker
slice is confined to its explicit implementation/test list and proved by
`bun test <adjacent-test-files>` with named cargo cases and zero failures. Return verified
uncommitted work; no parallel builds/tests while worker runs. Parent effective
sandbox is full access; file ownership and no secret/network work remain binding.

Acceptance and proof:
- Core tests prove all canonical inputs, alias/case/trim -> crates, unknown rejection,
  and strict guards/lists still excluding cargo; browser/root import works.
- Package-spec tests prove cargo/crates/case/exact forms equivalent; missing name,
  trailing @ and unknown prefixes still fail; names/scopes/Maven/version retained.
- Six adjacent request tests prove canonical enum/params equality (upgrade single
  and batch), resolver alias+canonical dedup and explicit alias target rejection.
- Navigation, unified-search, changelog target/request and diff request tests prove
  compact inheritance and unchanged range/exact-version rules. Service/parity tests
  prove canonical request variables reaching mocks, not only accepted input.
- Presentation tests prove cargo-labelled package state/recovery and canonical
  newly constructed actions; code-files tests prove valid/malformed cargo conflicts
  with --repo-url and no service call. Read/list/grep request tests prove byte-for-byte
  target forwarding, alongside repo/site/HTTP/opaque regression cases.
- Run focused Bun files for every touched area, `bun run typecheck`, `bun run build`,
  `bun run --cwd packages/mcp build`, `bun run validate:packages`, and owned-file
  formatting/lint. Public artifacts contain no private aliases.
- Permanent smoke alias cases exercise only client-normalized paths such as
  pkg_info/search, which send CRATES independently of backend alias deployment.
  Forwarded cargo read/list/grep checks remain one-off recorded live verification,
  outside shared hosted smoke assertions until deployment is verified. Run `bun run smoke:cli` and
  `bun run smoke:mcp` with dev preset and no unintended endpoint overrides. If auth
  missing, explicitly classify results as auth-handling only. If available, pair
  cargo/crates Rust metadata, search and transparent list/read/grep and compare
  semantic identities/results (raw target/replay labels may differ). Verify dev
  admission before claiming alias deployment, never deploy to unblock testing.
- Run `CODEX_HOME="$HOME/.codex-eval" GITHITS_ENV=dev bun run agent:e2e --agent codex
  --surface mcp --server local --workload
  eval/agentic/workloads/package-overview-vulnerabilities.md` only through documented
  dedicated-home preflight; do not read/copy auth material. Inspect actual calls,
  final answer/confidence, metrics and isolation violations. Report preflight/auth/
  provider blockers accurately; canonical model spelling is not alias-use evidence.
- One bounded Luna preflight, own complete diff inspection, internal code review,
  then fresh Opus Claude review (max three external code rounds) using agent-feedback
  to adjudicate. Plan review gets its own internal + fresh external session, closed
  after clean; implementation reviewer retained through PR merge approval.
- Re-fetch main before PR, reconcile changes if any. Build before commits. Push own
  branch, open draft PR targeting main with enhancement label, run/inspect CI.

Docs and completion: keep plan until clean implementation review, then transfer
contract and measured evidence to `docs/implementation/package-registry-aliases.md`,
short README/help notes, and remaining hosted work to `docs/plans/open-backlog.md`.
Retire plan in final substantive commit; never edit historical changelog or bump
versions. Record review dispositions and actual checks before retirement. Report
PR URL, commits, checks, deployment/publication gates and retained reviewer handle.

### Phase 2: hosted adoption (later authorized increment)

Status: OUTSIDE SCOPE/BLOCKED. Assumptions: hosted behavior comes from published
`@githits/mcp`, no duplicate implementation. Product decisions: none currently;
explicit publication, handoff, merge and deployment approvals still required.
Dependencies: intended public artifact release and backend alias availability.
Unknowns: exact released version, consumer main/lockfile and deployed state;
resolve at that handoff. Acceptance: manifest/lock resolve intended artifact,
consumer checks pass, separately approved deployed paired metadata/search and
forwarded list/read/grep succeed. Revert dependency for rollback. Tactical details
belong in receiving repository after reorientation, not this PR.

## Boundary reorientation and cleanup

Before any later increment, fetch its current main and verify actual package and
backend deployment records; use next-steps if available, otherwise record equivalent
explicit evidence. Replan if ownership or contract changed; ask only for actual
product decisions, major scope, infrastructure or last-mile approvals. No pending
major finding is known. No refactor is needed beyond replacing duplicated spelling
admission with the existing core owner.

## Plan review disposition (2026-10-19)

Internal review: direction sound, no findings. External round 1: direction sound.
F1 accepted: unscoped permanent alias smoke could depend on undeployed backend
admission; scoped to client-normalized calls, scanned public MCP smoke export and
CLI live paths; forwarded calls remain recorded deployment verification.
F2 accepted: existing cli-commands.md guard/spec documentation must match; added
existing docs to scope, tools.md grammar to check.
F3 accepted: core parser trimming also admits whitespace around compact registry
segments; stated explicitly with a regression case, names/versions untouched.
F4 accepted: the six identical admission substitutions are one settled mechanical
concern with six named equality tests; consolidated into the third dispatch.
No rejected findings or open major findings. External round 2 and its fresh-context final check: clean, no findings. Plan reviewer released; terminal closed with processAction closed_agent_terminal.

## Implementation checkpoint

Three sequential Luna slices accepted after diff inspection: core parser (9 tests,
66 expectations), package-spec (19 tests, 33 expectations), builders (161 tests,
303 expectations). No correction dispatch required. Coordinator implemented
presentation/code-files integration, inherited/forwarding/parity tests, smoke
coverage and documentation. Owned TS formatting/lint passed. Focused integrated
verification: 1,069 tests, 3,492 expectations across 36 files; typecheck and public
package validation (including root/MCP builds and packed-consumer checks) passed.
Required Codex local neutral-discovery eval completed, but 0 GitHits calls means
no changed-path/alias evidence; final success/high confidence, no isolation
violation artifact. Metrics and limits are retained in durable alias docs.
Source CLI/MCP smokes passed (43/10 steps), with live cohorts skipped AUTH_REQUIRED.
Built Node CLI and MCP registration/auth smokes passed too. Code review is next;
no product decision emerged.
