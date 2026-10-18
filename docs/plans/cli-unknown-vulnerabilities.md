# Direct unknown vulnerability evidence

Status: implementation complete; verification passed; coordinator review pending.

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
- Complete before/after text and JSON summary excerpts, sizes and UX judgments
  are in `docs/implementation/package-vulnerability-assessment-evidence.md`.
  Full captures remain under `/tmp/githits-unknown-vulns-evidence` locally.
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
