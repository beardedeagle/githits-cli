# GitHits service environments and OSS endpoint branding

Status: Phase 1 implementation and review complete; merge pending.

## Outcome

The CLI and locally launched MCP server use the GitHits-branded OSS endpoint
by default. `GITHITS_ENV=dev` selects a complete development backend without
requiring four independent overrides. Explicit service URLs remain available
for local development and custom deployments. `PKGSEER_URL` no longer affects
runtime configuration or gets forwarded by the eval harness.
This reaches CLI/local MCP and consumers using the public MCP client URL getters;
the separately configured hosted MCP server does not adopt these defaults merely
by upgrading `@githits/mcp`.

Dependencies: existing service configuration, auth storage, diagnostics, and
eval/smoke infrastructure. No new dependency or infrastructure is needed.

Assumptions: the user's proposed selector means absent `GITHITS_ENV` is `prod`,
and explicit URL overrides take precedence over a preset. On 2026-09-28 the user
confirmed that the existing `GITHITS_CODE_NAV_URL` is the OSS override, with no
additional OSS environment variable, and the raw dev Supabase URL is the dev
accounts default. Unknowns: authenticated dev REST availability has not been
verified; this does not change the specified hostname or prevent deterministic
implementation. Open product decisions: none. On 2026-09-28 the user excluded tests for the
removed `PKGSEER_URL` variable as having no value; test presets and supported
overrides instead.

## Verified baseline before implementation

- `packages/core-internal/src/services/config.ts` owns MCP, REST, and OSS URL
  getters. Production MCP/REST defaults are already branded; the OSS default
  is `https://pkgseer.dev`. `GITHITS_CODE_NAV_URL` precedes the undocumented
  `PKGSEER_URL` alias. No other `PKGSEER*` environment variable was found in
  tracked runtime code. Registry constants and GraphQL helper names containing
  `PKGSEER` are code identifiers, not environment variables.
- `getMcpStorageKeyUrl()` deliberately skips URL validation for local auth
  inspection and cleanup. `src/container.ts` uses it for auth commands and
  auto-login session metadata; network containers use `getMcpUrl()`. Tokens and
  client registrations are already keyed by MCP URL, so presets need no storage
  migration or new namespace scheme.
- `src/services/settings-service.ts` owns the fourth, CLI-only accounts URL.
  `GITHITS_ACCOUNTS_URL` currently defaults to production independently.
- `src/commands/doctor.ts` duplicates endpoint defaults and alias precedence,
  selects file-auth records with an independently resolved MCP URL, and renders
  every default as "default production". Its injected environment must remain
  independent of `process.env`.
- `scripts/agent-eval.ts` has separate backend passthrough and local MCP config
  allowlists; both contain `PKGSEER_URL`. `scripts/smoke-environment.ts` isolates
  credentials/endpoints and supplies invalid fake URLs for unauthenticated runs.
- Direct Cursor setup and generated remote plugin manifests use production MCP
  independently. Changing those persistent host configurations is outside this
  runtime-preset increment; local stdio inherits the launching environment.
- Read-only inspection of the local `githits-remote-mcp` checkout verified its
  `src/config.ts` independently defaults OSS to `https://pkgseer.dev` using
  `GITHITS_CODE_NAV_URL` / `GITHITS_CODE_NAVIGATION_URL`; its dev Fly config uses
  the existing override with the old dev backend hostname. It does not use the
  package's URL getter. Hosted production/dev OSS branding therefore needs work
  owned by that separate repository and deployment, outside this CLI request.
  Its `GITHITS_ENVIRONMENT=production|development` is an independent server
  configuration contract. This CLI plan follows the user's proposed
  `GITHITS_ENV=prod|dev` rather than expanding into server configuration migration.
- Credential-free endpoint probes on 2026-09-28: read-only
  `POST /api/graphql` with `query { __typename }` returned HTTP 200 and GraphQL
  data from both `https://oss.githits.dev` and `https://oss-dev.githits.dev`.
  GET requests returned 403, so GET alone would have misdiagnosed availability.
  Dev MCP protected-resource and authorization-server discovery returned 200
  and identified `https://zcwquvryvmjuwckxdevg.supabase.co/auth/v1`.
  `GET https://zcwquvryvmjuwckxdevg.supabase.co/functions/v1/settings/me`
  returned 401 without credentials. `accounts-dev.githits.com` did not resolve;
  `api-dev.githits.com` timed out twice with a 15-second request timeout.
  These probes establish routing/discovery, not authenticated product behavior.
- The user's dev example still uses `PKGSEER_URL`, contradicting the requested
  removal. Replace that spelling with the chosen GitHits OSS override.

## Scope and ownership

Endpoint defaults and environment selection naturally belong to the existing
transport-neutral configuration module: the CLI and public MCP client already
consume it. Extend that module instead of adding a CLI-only resolver or a new
configuration subsystem. Accounts requests and their concrete client remain
CLI-owned; the CLI accounts getter uses shared environment selection, with the
accounts default table kept in `settings-service.ts`.

The root container owns environment-dependent auth composition. Login and
refresh receive storage-derived MCP URLs and can bypass network URL getters;
validate the selector through their existing injected fetch dependency at the
first outbound auth request. Keep `AuthServiceImpl` consuming explicit OAuth
URLs rather than teaching that client to read host environment variables.
Wrap only those auth factories' injected fetch dependencies; do not add selector
validation to generic `createLazyCliFetch`, which also serves the unrelated npm
update check and must remain independent of backend environment selection.

Keep existing service constructors, `codeNavigationUrl` fields, GraphQL helper
names, registry constants, and public exports. Renaming internal pkgseer code
identifiers would expand the delta and change exported MCP client APIs without
helping environment selection. Do not change GraphQL queries, OAuth discovery
contracts, storage schemas, hosted deployments, generated remote transport URLs,
or versions. At the user's additional request on 2026-09-28, add a short dev-testing
block to canonical `AGENTS.md`, shared through its existing Claude/Gemini symlinks.
This repository testing guidance belongs in `AGENTS.md`; it does not require
changing public MCP routing instructions or skills. No `.env` containing credentials is added; public preset URLs live
in source and permanent configuration documentation.

## Configuration contract

| Service | `prod` (also unset) | `dev` | Override |
| --- | --- | --- | --- |
| MCP / OAuth namespace | `https://mcp.githits.com` | `https://mcp-dev.githits.com` | `GITHITS_MCP_URL` |
| REST | `https://api.githits.com` | `https://api-dev.githits.com` | `GITHITS_API_URL` |
| OSS package/source | `https://oss.githits.dev` | `https://oss-dev.githits.dev` | `GITHITS_CODE_NAV_URL` |
| CLI accounts | `https://accounts.githits.com` | `https://zcwquvryvmjuwckxdevg.supabase.co` | `GITHITS_ACCOUNTS_URL` |

- `GITHITS_ENV` accepts the exact values `prod` and `dev`. Unset, blank, or
  whitespace-only means `prod`, matching existing auth-selector conventions;
  other values produce an actionable configuration
  error when a network operation needs configuration, without echoing values.
- Overrides select one service only. OSS precedence is `GITHITS_CODE_NAV_URL`,
  then the chosen environment default. A present blank override is invalid;
  it must not silently select a default. No additional OSS override is added.
  `PKGSEER_URL` is ignored, including if it is the only old override present.
- Preserve HTTPS/exact-loopback-HTTP validation. Do not infer other endpoints
  from a custom MCP hostname. API tokens supplied by the caller continue to take
  precedence over stored OAuth; the selector does not determine their provenance.
- Shared getters accept an optional explicit environment object, retaining
  existing no-argument public calls. Resolve defaults per call, without caching
  or modifying `process.env`. Network consumers validate before authenticated
  requests. Diagnostics consume the same selection policy with their injected
  environment and represent invalid configuration as diagnostic findings.
- Valid dev selection changes the MCP URL used for token/client storage and
  auto-login metadata. Switching to dev uses its own existing namespace and
  requires a dev login when no dev credentials exist. Switching back to prod
  finds the existing production namespace without migrating credentials.
- Keep `--help`, `--version`, `doctor`, `uninstall`, and credential cleanup usable
  with malformed environment/network configuration. A storage-only MCP lookup
  must not validate URLs. For an invalid selector with no explicit MCP override,
  local cleanup/inspection uses the existing production namespace; doctor reports
  the invalid selector and must not claim that network configuration is valid.
  Network getters reject the invalid selector, so this local recovery behavior
  cannot route an authenticated request; auth composition must enforce that same
  selector validation before discovery, registration, exchange, or refresh fetches.
  Preserve the existing all-backend logout
  behavior. This narrow recovery contract avoids new storage or cleanup machinery.
- Doctor shows the selected environment, identifies dev defaults accurately,
  retains production-default text brevity, and finds credential metadata using
  the same storage namespace. Keep the existing `codeNavigationUrl` JSON field;
  make additive diagnostic fields only as needed for selector/error reporting.
- Eval child environments, local MCP configuration, and redacted run metadata
  carry `GITHITS_ENV` and the existing endpoint overrides. Remove legacy
  passthrough. Isolated unauthenticated smoke strips the selector and endpoint
  overrides; scoped authenticated smoke retains chosen dev configuration.
  `GITHITS_ACCOUNTS_URL` needs no addition to eval passthrough or smoke managed-key
  lists: accounts is CLI-only, and the current smoke suites do not use settings.

## Phase map

One phase — branded production OSS defaults and complete dev runtime selection
work consistently across CLI, local MCP, auth namespaces, doctor, and evals
(COMPLETE; merge pending).

### Phase 1: implement and deliver

Status: implementation complete; verification and reviews passed.
Outcome: the configuration contract above is observable through service requests
and diagnostics. Dependencies: existing configuration/auth/eval interfaces only.
Assumptions: the endpoint table and compatibility choices above.
Unknowns: dev REST availability affects live validation only.
Open product decisions: none.

### Orchestration sequence

The coordinator owns shared endpoint selection, CLI accounts/auth composition,
doctor, regression tests for those paths, the requested repository dev-testing
guidance, verification, and review. One Luna
implementor receives the following mechanical slices sequentially, returning
uncommitted work and exact targeted evidence after each. Full-access sandbox
applies; each brief limits editable files explicitly. No commits or additional
validation infrastructure are delegated.

1. Smoke environment selector isolation: `scripts/smoke-environment.ts` and its
   existing tests; one named regression proves isolated selector stripping and
   scoped dev preservation.
2. Eval selector passthrough: `scripts/agent-eval.ts` and its existing tests; one
   named regression proves child environment, MCP/Codex configuration, and safe
   metadata preserve the selector and supported overrides. Legacy removal is
   verified by source inspection.
3. Permanent configuration documentation: `docs/implementation/config.md`;
   inspect the exact preset table, independent override contract, and namespace
   explanation against the implemented config.
4. Related active configuration references: `docs/implementation/unified-read.md`,
   `docs/implementation/tools.md`, `docs/implementation/repository-targets.md`,
   `eval/agentic/README.md`, and the existing configuration-contract paragraph in
   `docs/plans/unified-graphql-read-adoption.md`; verify legacy references are
   historical only and the current dev recipe uses the selector.
5. Preset/default release note: the independent changed fragment named below;
   verify exact artifact impacts and getter/hosted boundary wording.
6. Legacy override removal note: the independent removed fragment named below;
   verify exact artifact impacts and the replacement override name.

Each concern stays separate; the worker receives only its current slice.

1. Add configuration behavior tests, then extend
   `packages/core-internal/src/services/config.ts` in place. Preserve exported
   production constants and existing getter signatures; add only the smallest
   shared environment-selection helper needed by CLI accounts/doctor. Check
   `packages/core-internal/src/index.ts` and `packages/mcp/src/client.ts` export
   boundaries before exposing any new helper publicly.
2. Update `src/services/settings-service.ts` and its tests to select the dev
   accounts URL without moving the accounts client into core. Update doctor URL
   selection, dev/default display, and file-auth namespace lookup together.
   Add container/auth metadata coverage proving dev selection and prod retention;
   preserve recovery commands and deferred network/proxy validation. For the
   existing two storage-only auth dependency factories, validate the selector
   lazily through the injected auth fetch, before its first request; keep the
   OAuth client interface and explicit URLs unchanged.
3. Update eval passthrough/config allowlists and tests, smoke isolation and tests,
   and changed-path endpoint fixtures. Service transport errors already name
   `GITHITS_CODE_NAV_URL` and need no naming change.
   Update active configuration references in `docs/implementation/config.md`,
   `docs/implementation/unified-read.md`, `docs/implementation/tools.md`, and
   `eval/agentic/README.md`. Update the historical dev replay guidance in
   `docs/implementation/repository-targets.md` explicitly.
   Label historical dev replay examples in implementation documents as historical
   and give the current `GITHITS_ENV=dev` replacement; do not rewrite recorded
   historical measurements or versioned changelog sections. Update affected plan
   contract references without changing another plan's scope or status.
4. Add independent `changes/githits-service-environments.changed.md` and
   `changes/pkgseer-url-override.removed.md` fragments, naming both artifacts in
   each. Pending impact: `githits: minor`, `@githits/mcp: minor` for the added
   preset, changed OSS default, and intentional legacy alias removal in these pre-1.0
   packages. Phrase the package note as getter defaults for consumers using
   those getters, without implying a hosted deployment. Document the env migration
   explicitly; release prep
   owns version bumps. Public skill files contain no affected endpoint references
   and should not be changed to advertise unreleased onboarding behavior.
5. Run the verification below. Use the repository maintenance skill for the
   auth/setup-adjacent work and generated-asset validation. Finish internal
   pre-flight and one external Claude reviewer per round; fix accepted findings
   and re-review code findings until clean or the three-round limit. Commit with
   a Conventional Commit body, push, and open a draft PR. Merge/release/deploy
   require separate human approval.

### Acceptance and verification

- Unit tests cover unset/prod/dev, every explicit override, mixed overrides,
  OSS override precedence, invalid selectors and URLs, exact
  loopback HTTP, and explicit environment injection without global leakage.
- Container, auth metadata, and doctor tests show dev uses dev credentials and
  prod credentials survive switching. Doctor remains usable on invalid selector
  and malformed URL values and retains credential redaction. Local help/version,
  uninstall, logout, and existing malformed-env regression paths remain usable.
  With an invalid selector, login discovery and expired-token refresh issue zero
  requests; tests must cover these paths rather than only network URL getters.
  The npm update check remains independent of an invalid backend selector.
- Eval tests prove selector/existing override propagation to child processes and
  local MCP config, including Codex and Claude launch vectors. Smoke tests prove
  isolation strips them and scoped mode retains them. No active runtime or eval
  code reads/forwards `PKGSEER_URL`; verify removal by source inspection, without
  tests for the absence of the retired variable.
- Initial targeted command:
  `bun test packages/core-internal/src/services/config.test.ts src/services/settings-service.test.ts src/container.test.ts src/commands/doctor.test.ts scripts/smoke-environment.test.ts scripts/agent-eval.test.ts`.
  Include directly modified auth metadata/CLI recovery tests as needed; then
  `bun test`, `bun run typecheck`, `bun run lint`, `bun run format:check`,
  `bun run build`, `bun run --cwd packages/mcp build`, `bun run validate:packages`,
  `bun run plugins:generate`, and `bun run plugins:check`.
- Run `bun run smoke:cli --mode unauthenticated` and
  `bun run smoke:mcp --mode registration`. Smoke launch/isolation changes also
  require `bun run smoke:cli:built` and `bun run smoke:mcp:built` after building.
  When authenticated access is available, run the affected normal CLI/MCP smoke
  surfaces with `GITHITS_ENV=dev`; report auth/network limitations precisely.
- For agent-facing environment passthrough, run one targeted local-MCP workload:
  `GITHITS_ENV=dev bun run agent:e2e --agent codex --surface mcp --server local --intent-profile githits --workload eval/agentic/workloads/package-overview-vulnerabilities.md`.
  Inspect actual calls, final answer, metrics, and isolation violations. No
  descriptor/full-instruction rewrite is planned, so broad dual-agent discovery
  evals are unnecessary; launch-vector tests cover both harness integrations.
- Extend the existing public-package consumer check in
  `scripts/validate-public-packages.ts` to verify packed `@githits/mcp/client`
  prod/dev getters and an independent override from outside root aliases, plus
  an explicit-environment call through its packed declarations.
  No private imports leak and old exported config names remain available.

No performance optimization is proposed. Endpoint selection remains constant
time and introduces no extra request; no benchmark is needed for this claim.
Rollback restores prior defaults/alias behavior without changing stored auth.

## Completion and cleanup

Before implementation, reconcile user replies and review findings against the
endpoint table and ownership boundary. Stop for any proposed new infrastructure,
host transport change, or broader public API rename. There is no later phase to
detail; if scope changes, reorient the plan instead of adding mechanical phases.

Completion requires passing verification, a clean accepted review round, updated
permanent configuration docs, and an open draft PR with known live limitations.
Keep this plan through implementation review. After the last increment merges,
transfer durable decisions/evidence into `docs/implementation/config.md`, move
any genuinely major outstanding work to the repository backlog, and delete the
plan. No deferred development item is currently identified.

## Plan review record

Internal pre-flight: no findings. Its residual-risk note identified login/refresh
as consumers of storage-derived URLs; the contract and acceptance criteria now
explicitly require lazy selector validation before their first auth request.
External Claude round 1: five notes adjudicated on 2026-09-28.

- Hosted defaults: accepted the documentation limitation, verified the separate
  server resolver and dev override usage, and clarified package getter scope. This
  is outside the requested CLI increment; no other worktree was edited and no
  cross-repository task was dispatched. Hosted follow-up is reported to the user.
- Server-selector collision: accepted as context and recorded the separate
  server contract; rejected reopening CLI selector naming because the user
  explicitly proposed `GITHITS_ENV=prod|dev`. No new evidence establishes a need
  for unified host/client configuration or a server migration.
- Blank selector: accepted the smaller, existing auth-selector convention and
  updated its behavioral contract and tests. Blank URL overrides remain errors.
- Auth fetch isolation: accepted; explicitly excluded generic lazy fetch and
  added npm-update independence coverage. Related auth factories, update-check
  construction, local recovery paths, and shared URL getters were checked.
- Active references/release grouping: accepted; included permanent tools docs
  and separate removal release grouping. The user's later decision to keep
  `GITHITS_CODE_NAV_URL` means the three transport errors already use the correct
  override and require no naming edits. Existing historical replay and older-plan
  contract updates were already in scope.

Internal closure pre-flight: no findings on the full revised plan.
External Claude round 2: clean, including its required single fresh-context
final check. Accepted its wording nit: the outcome now says four overrides to
match the accounts-inclusive table. No further review round is needed for that
wording fix. That review preceded the final product decisions recorded below.
No code, schema, storage, descriptor, or deployment changes were made during
planning; no production tests were run for this plan-only artifact.

### Final user decisions and closure

On 2026-09-28 the user selected the raw dev Supabase accounts URL and rejected
adding a separate OSS override. Keep `GITHITS_CODE_NAV_URL` as the supported
override; no new OSS variable or compatibility alias is introduced. This removes
the additional override-precedence tests and three transport-error naming changes
from the earlier proposal. Do not reintroduce the rejected extra variable in
implementation or later review without new user direction.

Internal pre-flight of the narrowed plan: clean. Final external Claude round
(round 3 overall): clean, including its required fresh-context final check.
Applied its three documentation notes: explicitly name the repository-targets
replay document, explain why CLI-only accounts needs no eval/smoke allowlist
addition, and replace pending review status with the completed results. No
further round is required for these documentation-only fixes. No tests were run
for this plan-only update; implementation verification remains as specified above.

## Implementation verification record

The six planned Luna slices were accepted after exact diff and command-output
inspection. A seventh dispatch removed legacy-variable test assertions after
the user explicitly excluded them; it corrected the specification, not a worker
defect. No interrupts, scope violations, or invented infrastructure occurred.
Coordinator-owned work includes selector resolution, accounts/auth/doctor,
behavioral regressions, requested `AGENTS.md` dev guidance, and packed-consumer
checks. Luna preflight accepted plan/docs conformance; its sole API-documentation
note was applied to all four exported URL getters' injected environment parameter.

On 2026-09-28, verification passed:

- `bun test`: 4,955 pass, 0 fail, 17,843 assertions across 210 files.
- `bun run typecheck`, `bun run lint`, and `bun run format:check`: pass.
- `bun run plugins:generate` and `bun run plugins:check`: 10 assets generated/
  validated, with no generated diff. Claude/Gemini guidance remain symlinks.
- `bun run validate:packages`: pass, including its root and MCP builds, packed
  client prod/dev/override assertions, external packed declarations, and private
  boundary checks.
- `bun run smoke:cli --mode unauthenticated`,
  `bun run smoke:mcp --mode registration`, `bun run smoke:cli:built`,
  and `bun run smoke:mcp:built`: pass.

Internal code preflight: clean, no findings. The dev Codex eval completed
successfully with the documented dedicated eval home after the first invocation
stopped at its missing-home preflight. No auth contents were inspected.

- Dev smoke commands explicitly unset the four URL overrides and set
  `GITHITS_ENV=dev`. CLI live smoke exited 0 with a partial pass: the stable
  cohort skipped for authentication; the experimental live cohort passed. A
  repeat with the same command passed both live cohorts: 138 steps, 101.2s.
- The first dev MCP live smoke timed out on `pkg_info` at 60 seconds. The
  dev agent eval's first `pkg_info` took about 68 seconds and completed; a
  later telemetry-enabled CLI package probe succeeded with container/token
  resolution about 29ms and request about 981ms. The latency cause is not
  established. One telemetry-enabled repeat of the same MCP smoke passed its
  full live suite: 63 steps, 152.4s. No timeout, retry, or recovery mechanism
  was changed. Both MCP and CLI repeats completed their previously limited
  stable cohorts, including dev REST example calls. Earlier anonymous dev REST
  timeouts do not establish ongoing unavailability.
- Corrected eval command: `env -u GITHITS_MCP_URL -u GITHITS_API_URL -u
  GITHITS_CODE_NAV_URL -u GITHITS_ACCOUNTS_URL CODEX_HOME=/Users/jpl/.codex-eval
  GITHITS_ENV=dev bun run agent:e2e --agent codex --surface mcp --server local
  --intent-profile githits --workload
  eval/agentic/workloads/package-overview-vulnerabilities.md
  --out /tmp/githits-env-agent-eval`. It passed in 89.8s, with three completed
  calls (`quick_start`, `pkg_info`, `pkg_vulns`), no validation/isolation
  violations or missing artifacts, and a high-confidence final answer.
  Run metadata confirmed `GITHITS_ENV=dev` and no URL override. Metrics: 28,255
  uncached input, 106,240 cached input, 662 output tokens; rate-based estimated
  cost $0.00422. This is execution/trace evidence, not graded answer quality.

External implementation review round 1: clean, including its one required
fresh-context final check; no findings or validation reruns. Its observation
that doctor reports a raw explicit URL while the invalid selector still blocks
network calls is not a defect: the diagnostic source field describes the
override, and the selector probe/recommendation identifies the invalid setting.
No change or further round was required. The same Claude session remains
retained through PR merge approval.

Implementation commit: `75a450c` (`feat: add GitHits service environment presets`).
The completion-record commit accompanies delivery. No unresolved implementation
findings, new refactoring requirement, or deferred CLI development remains.
The separate hosted MCP resolver/deployment boundary remains outside this
repository's change. Initial dev latency cause is unproven; passing repeats
establish current end-to-end behavior, not a latency guarantee.

The implementation is ready for the draft PR and CI; merge, release, and hosted
deployment remain separate human-approved steps. Keep this plan until merge.
