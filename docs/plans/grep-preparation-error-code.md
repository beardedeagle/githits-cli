# Grep preparation classification

Status: implementation complete; final verification/review in progress. One PR.
Outcome: CLI/MCP classify preparation by issue reasons, preserve backend facts,
and render readable hints without changing successful unknown-reason diagnostics.
Unknowns/product decisions: none. User clarified that every comparable reason
that clears by waiting must say INDEXING, superseding the hand-off's two examples.

## Verified evidence and ownership

CLI base origin/main 88ede54; PkgSeer origin/main 8159ac80b (grep sources unchanged
through 87b6e7f48). Read-only preparation_copy.ex, preparation.ex,
preparation_errors.ex, grep.ex, documentation inventory, ERROR_CODES.md, and
usage_tracking/grep_classifier.ex. Backend pending reasons are repository_indexing,
documentation_publishing, documentation_discovery, site_v6_required and
starting_url_pending. Dedicated ref/version envelopes precede preparation mapping.
Aggregate retryability is computed before the twenty-issue publication bound.

The shared mapper owns error codes and error-hint fallback policy. The existing
reason translator owns known copy and preserves unknown diagnostics for success
formatters. Restoring that boundary avoids changing established success behavior;
no new API, services, flags, retries, query selections or infrastructure.

## Increment

Status: IMPLEMENTED. Dependencies: shared mapper/formatter and existing service
mocks. Assumptions: backend issue order is stable, retryability authoritative,
future reason vocabulary remains open (all verified). Unknowns: none.

- All five pending reasons -> INDEXING unless per-issue retryable is false.
- Unknown reasons -> INDEXING only with retryable true and nonblank progress_ref.
- First non-INDEXING issue wins, otherwise INDEXING for nonempty progress-only
  lists only if aggregate retryable is not false. Missing/malformed lists and
  hidden terminal blockers indicated by aggregate false -> UNRESOLVABLE.
- Missing repository/package/source -> NOT_FOUND; missing repository ref ->
  REF_NOT_FOUND; package version/source-ref -> VERSION_NOT_FOUND; ambiguous ->
  INVALID_ARGUMENT; transient repository failures -> BACKEND_ERROR; remaining
  known blockers -> UNRESOLVABLE. Full table lives in unified-grep.md.
- Preserve messages, backend retryability and existing structured issue projection.
  Omit first duplicate hint diagnosis; retain paths and readable extra blockers.
  Version/ref text retains hints. Unknown success diagnostics remain raw as before.

Acceptance: both JSON paths and text paths covered; known progress/terminal and
unknown/mixed/truncated lists covered; focused/full checks and dev replay evidence;
patch fragment for both public artifacts; consumer audit; clean review, draft PR
and CI. No merge/tag/release/publish. No optimization/performance claim.

## Verification and review closure

229 expanded focused tests now pass; prior 70 recovery tests passed; typecheck/build and
Biome passed. Both dev smoke scripts pass with empty file-auth temporary homes
(authenticated cohorts skip AUTH_REQUIRED); default isolated keychain unavailable.
Three authenticated built Node dev replays passed: missing repo NOT_FOUND, missing
Express ref dedicated REF_NOT_FOUND, two missing repos NOT_FOUND with concise hint.
Codex targeted eval: one quick_start, one grep, no wait/retry loop; final explains
missing target/correction, high confidence. Harness success; expected impossible-
target final failure, no isolation violation artifact, no usefulness grade.

External code review round 2 was clean including final check. User then clarified
all five pending reasons should index. CI also found six assertions in adjacent
success-format tests: our neutral shared fallback discarded unknown diagnostics.
Root cause fixed by restoring shared raw fallback and keeping neutral fallback
local to error hints. Known docs-unavailable copy retained. Expanded focused
checks include grep-response, grep-text-rendering and indexing-estimates tests;
full bun test fixed all six grep failures (6653 pass), but one existing auth-lock
reclamation test exceeded its artificial 100 ms filesystem budget. The isolated
rerun passed; give this success-path test a 1000 ms budget (not a timeout-behavior
test), leave production and deadline tests unchanged, and rerun the full suite.
Typecheck/build and both final authenticated built dev replays pass. Re-review
full revised delta (round 3).

Consumers read-only: remote MCP imports @githits/mcp ^0.35.0 (not a CLI delegate),
no grep-specific INDEXING dependency. Public API validates backend envelopes
directly; no CLI-code dependency. Hosted rollout needs package release/dependency
update/deployment after this PR. Public skills have no stale error-code guidance.
Patch fragment required/included for both artifacts; no minor/version bump here.
No deferred items or refactoring opportunities requiring more work.

## Cleanup

Keep this plan available for revised review. Durable mapping/fallback rules remain
in unified-grep.md, with tools.md link. Update actual verification/PR evidence;
after clean review remove this restored temporary plan as the final commit.
