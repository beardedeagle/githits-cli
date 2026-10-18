# Direct unknown vulnerability evidence

Status: round 1 fixes implemented; coordinator re-review pending.

## Outcome and verified contracts

Direct CLI `pkg vulns` and MCP `pkg_vulns` expose the backend unknown advisory
bucket, assessment status and reasons without treating unknown as historical.
The local PkgSeer schema confirms `unknownVulnerabilityCount`,
`assessmentStatus`, `assessmentReasons` and `VulnerabilityScope.UNKNOWN`.
Unknown enum strings must survive parsing and JSON unchanged. Known reason
strings get human wording in text. Missing optional evidence stays absent,
not invented as zero or a completed assessment.

The service owns wire parsing; existing per-tool shared formatters own CLI/MCP
presentation. No new infrastructure or service composition is needed.
All direct vulnerability output modes consume summary status/counts and advisory
status/reasons. Upgrade compact batch queries omit advisory assessment reasons,
and select unknown-detail retryability only for JSON; wire tests cover both.

Coordinator decision: unknown scope is direct-only. Transitive summary counts
and package rows omit unknown-only packages, so deriving counts is incorrect.
Reject unknown scope combined with transitive mode before service invocation.
Wire transitive unknown scope only after backend counts/rows support it.

Upgrade review must preserve direct version unknown counts/status and generic
`unknownDetails` codes/messages, including future codes. Do not special-case
unreleased codes. Existing unknown prose should not repeat the same message.

## Scope, assumptions and unknowns

One additive CLI/MCP behavior increment, with release fragments for both public
artifacts. No backend edits, release, deployment or merge. No unresolved product
decisions. Live data may change; capture exact output rather than assume the
brief's example counts remain current. Existing auth must be used through the
CLI/MCP without reading credentials.

## Acceptance and verification

- Four direct counts reconcile in JSON and text; zero unknown adds no unknown
  text line. Status is visible. Unknown-only results never claim a clean result.
- `unknown` scope lists direct advisories and reasons; unknown enum values render
  verbatim. CLI and MCP use their own follow-up syntax.
- Upgrade review preserves unknown evidence in JSON and text.
- Unit tests cover absent fields, future strings, request validation, lossless
  JSON, shared formatters and wire selections.
- Capture before/after CLI text, MCP text and JSON for torch 2.2.0,
  tensorflow 2.4.0 and lodash 4.17.20, with character counts and UX judgments.
- Run targeted tests, `bun test`, build, CLI/MCP smoke and targeted descriptor
  eval; report any external limitation accurately.
- Update durable implementation docs and backlog for the explicit backend
  dependency. Keep this plan until coordinator review is clean; delete it in
  this PR after review, transferring any remaining useful evidence first.

## Observed results and review packet

- Production data matches the brief: torch 20 affected + 8 non-affecting + 3
  unknown = 31 all; tensorflow 384 + 49 + 1 = 434; lodash 5 + 5 + 0 = 10.
- Full captures remain under `/tmp/githits-unknown-vulns-evidence` locally.
  PR #486 owns the dated before/after measurements and excerpts; permanent
  contracts are in `docs/implementation/package-vulnerability-assessments.md`.
- Direct unknown live assertions pass for all three packages on CLI and local
  MCP: JSON equality, count reconciliation, complete unknown rows/reasons, and
  rejection of transitive unknown scope. A live torch 2.2.0 -> 2.2.1 review
  displays both unknown totals and generic incomplete-evidence details.
- `bun test`: 5,909 pass, zero fail across 243 files. Targeted smoke-fixture and
  projection tests passed after updating fixtures for the expanded smoke corpus.
- Typecheck, build, Biome for changed TypeScript and public-package validation
  pass. Required source CLI/MCP smoke pass in file-auth unauthenticated mode;
  authenticated affected paths were checked separately through the Node build.
- Descriptor-only package-overview eval completed with high confidence but
  zero GitHits calls (`discovery=not_exposed`), so it does not validate the new
  behavior or establish answer quality. Tool-calls/final/metrics inspected;
  no isolation-violations artifact was emitted. Run:
  `.agent-eval/runs/2026-10-18T08-16-28-294Z`.
- Extra built CLI and MCP smoke pass. The initial built CLI run overlapped the
  package validator's destructive rebuild of its input `dist` directory; a
  serial rerun after validation passed. No product-code workaround.
- Explicit backend-dependent transitive scope and release-dependent public skill
  follow-ups are recorded in `docs/plans/open-backlog.md`. No other deferrals or
  new infrastructure. Existing per-tool formatter boundaries remain appropriate.
- Keep this plan through coordinator review. After review is clean, delete this
  plan in a final commit in this PR; durable documentation/backlog already hold
  the lasting contract, evidence and deferred work.

## Coordinator review round 1

Status: fixes implemented and targeted verification passed; full CI evidence lives on PR #486.

All ten items accepted. JSON drops implied row statuses and empty reasons;
normal no-unknown text is unchanged and severity breakdown ordering is restored.
Uncertainty uses one logical reconciliation line and human status wording.
Confirmed-affected prose omits reason rows; raw invalid range markers have human
text while JSON retains source evidence. Cluster merging uses status precedence.

Transitive ALL fetches occurrence status and separates unknown from historical
within returned rows, without claiming complete unknown-only package coverage.
Upgrade transitive output has no corresponding occurrence labels to correct:
it displays affected package summaries. Direct upgrade hints carry full targets,
implied statuses disappear, and verbose triage skips duplicate detail messages.
Unknown prose is fetched once from unknownDetails and public JSON unknowns is
derived from those messages. Errors use CLI/MCP-native recovery syntax.

Release fragments now request minor impact for both public artifacts, as the
coordinator directed for additive scope values and JSON fields. Permanent docs
retain contracts and verification methods; dated captures were removed from the
repository. Remeasure direct outputs against the original baseline and a real
three-package compact/verbose upgrade batch; put sizes and excerpts in the PR.

### Round 1 evidence

- Direct text / MCP text / CLI JSON / MCP JSON character counts are now torch
  4531 / 1270 / 11208 / 11207; tensorflow 99894 / 1647 / 247338 / 247337;
  lodash 1002 / 1001 / 2287 / 2286. Baseline and current excerpts are in PR #486.
- A real three-package batch (torch 2.2.0 -> 2.2.1, lodash 4.17.20 -> 4.17.21,
  express 4.17.1 -> 4.18.2; transitive disabled) shrank from 3213 to 3069
  characters compact, and 13855 to 12399 verbose. Repeated target vulnerability
  details in verbose output fell from two to one.
- Latest focused formatter/projection tests: 196 pass, zero fail. Typecheck,
  changed-code Biome and public-package validation pass. Source CLI/MCP smoke
  pass in unauthenticated mode; affected live paths are checked separately.
- Full default-timeout Linux and Windows CI pass for code commit 543ca40,
  together with build/package validation and Bun/Node 20/22/24/26 compatibility.
  An earlier local broad run overlapped a source/test edit and host load above
  300 on ten logical CPUs: it had seven process/harness timeouts, a child-exit
  error, and one stale-module assessment assertion. That run was not a valid
  check of the committed tree. The assessment assertion passes in the focused
  rerun and clean CI. No product or test timers were changed.
- Targeted descriptor eval completed with three actual MCP calls: quick_start,
  pkg_vulns(all), pkg_vulns(unknown). It reported the 20/8/3/31 counts and the
  unknown/non-affecting distinction with high confidence. Tool-calls, final and
  metrics were inspected; no isolation-violations artifact was emitted. This
  records observed behavior, not a graded quality result. Run:
  `.agent-eval/runs/2026-10-18T08-51-22-358Z`.
- The core client and CLI/MCP JSON keep their existing unknowns fields by
  deriving them in memory from details; unknowns is never separately fetched.
- Review input `.review-r1.md` is local-only and must not be committed. This is
  a code-finding round, so the plan stays until coordinator re-review is clean.

## Coordinator review round 2

Direction remains sound; all four findings and both nits accepted. Verified the
backend selects affected advisories for current/target and uses report-less
advisory summaries for diff lists. Shared upgrade normalization owns lean JSON,
not service parsing: omit implied AFFECTED and empty reasons on those rows;
retain NOT_ASSESSED in JSON but omit its uninformative diff prose. Core alone
derives compatibility unknowns; detailed text uses unknownDetails directly.
Transitive occurrence JSON follows the direct implied-status rule. Scope flag
and value remain together when wrapping reconciliation prose. Upgrade totals
use singular advisory for allCount=1. Rename the release fragment to added and
record actual text/JSON behavior. No new infrastructure or deferred findings.

Regression tests and live before/after JSON sizes will verify these changes.
Keep this plan for the next coordinator round; review inputs remain untracked.

### Round 2 evidence

- Focused formatter and actual CLI/MCP JSON parity tests: 175 pass, zero fail.
  The first full run had 5938 passes and three failures: one stale service mock
  (now supplies core-owned unknowns), a 200 ms subprocess startup race and a
  five-second CLI subprocess timeout under host load above 180. Both subprocess
  cases pass unchanged in isolation. Final-tree full-suite and CI results are
  reported on PR #486; no deadlines or product code were changed for host load.
- Typecheck, changed-file Biome and public-package build/validation pass.
  Source smoke passes unauthenticated with live cohorts explicitly skipped;
  both secret-free built smoke suites pass.
- Authenticated built CLI/MCP upgrade JSON parity passes. The real three-package
  batch drops from 71000 to 67278 JSON characters: exactly 52 implied statuses
  and 94 empty reason arrays removed, with all other parsed evidence equal.
  Compact text stays 3069 characters; verbose text drops 12399 -> 11448.
- Transitive ALL live CLI/MCP evidence matches apart from per-request calculatedAt;
  all 35 returned occurrences follow the implied-status omission rule. Complete
  unknown-only package support remains outside scope. Direct capture sizes stay
  equal to round 1; the CLI flag/value now wrap together.
- Targeted upgrade descriptor eval completed five actual MCP calls in 72.6 s:
  quick_start, upgrade review, two unknown-scope reports and code_diff. Final
  answer gave 20 affected / 3 unknown / 8 non-affecting / 31 all on both sides
  and fully addressed unknown follow-ups. It interpreted the workload's ambiguous
  "diff" question as source code_diff, so that answer does not validate advisory
  diff interpretation. Tool-calls/final/metrics inspected; no isolation artifact
  emitted. Observed behavior only, no quality grade. Run:
  `.agent-eval/runs/2026-10-18T09-20-27-970Z`.
