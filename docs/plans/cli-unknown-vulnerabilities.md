# Final increment: complete transitive unknown evidence

Status: coordinator round 1 findings implemented; final CI and coordinator round
2 pending on PR #489. PR #486 is merged; this branch started at fresh
origin/main (8ef0760). The coordinator owns external review.

## Verified contract and ownership

PkgSeer #3392 supplies complete unknown summary/package counts and unknown-only
package rows. Combined = affected + non-affecting + unknown. Core owns parsing
and complete required counts; the existing shared vulnerability formatter owns
lean JSON and text. Text reads full core package counts, without decoding the
compact JSON projection. No new infrastructure, service composition or auth
changes. Durable contracts are in package-vulnerability-assessments.md,
cli-commands.md, mcp-cli-parity.md and pkg-upgrade-review.md.

## Final implementation and compatibility

- UNKNOWN works at request and service boundaries. Exact root identity,
  pagination and occurrence proof/count checks stay intact. Future status/reason
  strings and optional assessment evidence remain permissive.
- Query each of four non-null count buckets once; normalize the requested scope
  from those required counters, without alias/optional-count machinery. Select
  status for UNKNOWN/ALL, reasons for UNKNOWN/ALL or detail output, and
  advisory-wide evidence only for verbose/JSON.
- Summary JSON always emits affectedCount/nonAffectingCount/unknownCount/
  totalCount, including zero. Package JSON omits totalCount, the selected count
  implied by occurrenceCount, and zeros. ALL emits no package counts. Positive
  non-selected counts remain even when unknown is zero.
- Verified against origin/main: those counters and transitive occurrence
  assessmentReasons are new. Every existing field retains its exact shape,
  including empty matchedAffectedVersionRanges/fixVersionsAboveResolved arrays.
- Direct/transitive use one unknown-hint helper: no affected headline repetition,
  native list action under affected/non_affecting, reasons-below under unknown;
  transitive ALL emits no extra hint. Package lines appear only in affected/
  non_affecting scope and gain indentation after wrapping. Mixed-registry count
  identities use registry:name. ALL uses non-affecting and empty ALL says no
  advisory occurrences were found. Default zero-unknown text is unchanged.
- Backend dependency backlog entry is complete. Public skill examples stay
  release-bound. The independent fragment requests minor impact for both public
  artifacts. No merge, release, tag or publication is authorized.

## Round 1 evidence and review packet

- All five findings and all nits accepted; direction remains sound. New coverage
  rejects affected rows in UNKNOWN scope and preserves summary unknown counts
  when affected scope drops an unknown-only package. Count projection covers all
  four scopes, legacy arrays, exact indent, shared hints and registry collisions.
  Missing required counters fail parsing; optional/future assessment values work.
- Final focused checks: 381 pass / zero fail across service, formatter, CLI, MCP
  and parity tests. Typecheck and changed-file Biome pass without warnings;
  build and public-package validation pass. Final CI results are in PR #489.
- Full local suite: 5965 pass / 3 subprocess timeouts / 2 post-timeout errors,
  5968 tests across 243 files in 336.68 s, with host load above 200. Original
  three failed cases pass in isolation; a separately selected real-CLI error
  handler case still reaches its unchanged five-second deadline. None of those
  startup/error-policy files changed. No test deadlines were changed.
- Source CLI/MCP smoke pass in file-auth mode, explicitly skipping live cohorts.
  Smoke implementation is unchanged this round. The isolated-home keychain
  limitation described in the PR remains; normal-home authenticated feature
  checks pass. Built smoke results are reported in the PR.
- Live CLI/MCP parity, required summary totals, sparse package metadata and
  compatibility assertions pass. Only new fields are stripped for comparison
  with main; timestamp presence/type is preserved, excluding its request value.
  Captures: /tmp/githits-transitive-unknown/r1-*.
- Default text is byte-for-byte unchanged: torchvision CLI/MCP 4176/1103;
  express 1652/1498. Current JSON is torchvision 17317/17316 (main 17141/17140)
  and express 3992/3991 (main 3852/3851). Express growth falls 290 -> 140 chars;
  torchvision growth falls 228 -> 176. Unknown scope now succeeds with empty
  results: torchvision text 204/203, JSON 614/613; express 199/198 and 606/605.
- Live nonzero transitive unknown coverage is unavailable after PyPI resync:
  torchvision 21+116+0=137, torch 21+10+0=31, express 6+29+0=35. Fixtures cover
  nonzero unknown-only rows, reasons and hints. Do not claim live nonzero proof.
- Targeted descriptor eval: three actual calls (quick_start, ALL verbose text,
  UNKNOWN JSON), 52.5 s, correct 21/116/0/137 counts and empty scope, high
  confidence. Tool-calls/final/metrics inspected; no isolation artifact emitted.
  Observed behavior, not a quality grade. Run 2026-10-19T07-34-48-257Z.

After coordinator round 2 is clean, transfer any remaining durable facts and
DELETE THIS PLAN AS THE LAST COMMIT IN THIS PR. Keep it through review. Brief
and review files are untracked input and must not be committed.
