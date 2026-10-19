# Accurate, compact grep recovery copy

Status: IMPLEMENTING. One implementation increment; no open product decisions.

## Outcome and verified evidence

CLI and MCP text must distinguish an authoritative empty search from pending,
unsearchable, incomplete and paginated results, while retaining useful hits.
Fetched initial `origin/main`: `9d491bb`, identical to the starting HEAD.
Updated to current `origin/main` `c80c10f` during plan review; its MCP
cancellation change has no formatter overlap. Current
`formatGrepText` uses retryable omissions rather than exhaustive coverage for its
empty headline. Its existing `isExhaustive` and `hasPageCoverageGap` predicates
already distinguish healthy pagination from gaps. Source rows, preparation
attribution, exact read locators and cursor instructions are valuable and stay.

Verified recovery: `wait_timeout_ms` is a first-page preparation wait;
continuation never waits (`packages/mcp/src/tools/grep.ts`). `indexingWaitMs`
already derives bounded preparation waits. Per-item backend retryable fields are
authoritative; a terminal omission is not an invitation to retry unchanged.

## Ownership, scope and assumptions

The existing shared grep formatter owns presentation because both CLI and MCP
already use it. No service, request, API, JSON, descriptor, public skill or backend
usage-classification changes. No infrastructure, network retries or polling.
No new module or abstraction is needed. No migration; rollback is a formatter
revert. No credential or private usage data belongs in artifacts.

Assumptions verified in source: complete CURRENT scopes without gaps authorize
negative claims; UNSPECIFIED + RESUMABLE_LIMIT is pagination, not failure;
preparation reasons are repository_indexing/documentation_publishing. Zero
files scanned with unavailable readiness is the existing source-row criterion
for not searched; also cover zero-scanned FAILED scopes (a schema-supported
shape, with backend occurrence unverified). An empty CURRENT + COMPLETE corpus
remains an authoritative negative.
Unknowns: none. Dependencies: existing result fields/helpers, Bun and review tools.

## Increment 1 — accurate headlines and selective recovery (READY)

Expected outcome: fully searched empty results retain `No matches found.`;
retryable preparation-only gaps retain `No matches available yet.`; other gaps
get a qualified headline, and wholly unsearched failures say no content could be
searched. Healthy empty continuation pages retain their page-specific headline.
Returned hits and precise source/failure attribution remain usable.

1. Reuse coverage predicates for headline choice. Keep preparation copy specific
   to retryable preparation, and keep terminal preparation under omissions.
2. Mark retryable non-preparation omissions as such and include retryable native
   scope failures in recovery. Suggest retrying only eligible targets without a
   cursor; attach a wait only to preparation. Preserve independent continuation.
3. Separate Omitted with a blank line when it starts a section; put retryability
   before publicMessage so backend final punctuation remains intact.
   Remove generic limitation repetition where attributed coverage already
   explains it; retain cursor expiry and otherwise unexplained traversal limits.
4. Add focused state-matrix tests to shared formatter tests, adjust existing
   assertions, and verify CLI/MCP projections remain unchanged. Update
   `docs/implementation/unified-grep.md` and a patch fragment for both artifacts.

Acceptance: complete empty; all pending; ready empty plus pending; terminal and
mixed omissions; native unavailable/failed; hits plus failures; empty cursor
page; stale, skipped files and file issues all have accurate text. Terminal
targets receive no unchanged-retry invitation. Preparation waits and cursor
continuation are distinct; no mutation or loss of structured data.

Verification: focused grep formatter/response/preparation, MCP tool and CLI
parity/command tests with `bun test`; `GITHITS_ENV=dev bun run smoke:cli` and
`GITHITS_ENV=dev bun run smoke:mcp` (unauthenticated paths must pass); `bun run build`, typecheck and changed-file
format/lint checks. Run one targeted `bun run agent:e2e` grep workload if local
credentials permit; record any preflight blocker without exposing secrets.
The targeted eval is development-only (`GITHITS_ENV=dev`), with unintended
endpoint overrides removed; no production query. Its scope is qualitative
normal-path use; deterministic fixtures prove failure-state copy. Text-size baseline: existing `scripts/grep-text-size-benchmark.ts` cases
mixed-100 = 6967 bytes/110 lines; repository-100 = 5754 bytes/118 lines. Re-run
those exact cases to preserve successful output compactness; measure selected
failure outputs before/after as copy size, not runtime performance or token counts.

Plan and implementation each receive internal preflight and one external Claude
reviewer per round. No further phase: after a clean implementation review, move
durable evidence into implementation docs and remove this temporary plan in a
final commit in the same PR. Commit, push and open a draft PR; no merge/release.


## Headline precedence (zero hits)

| State, in precedence order | Headline |
| --- | --- |
| Only retryable preparation gaps, with cursor | No matches available yet on this page. |
| Only retryable preparation gaps, without cursor | No matches available yet. |
| Cursor and any other coverage gap | No matches returned on this page; coverage is incomplete. |
| Cursor without gaps | No matches on this page. |
| No cursor; all reported native scopes failed/unavailable before scanning, or no native scopes reported and only omissions (other than preparation-only above) | No content could be searched. |
| No cursor; exhaustive | No matches found. |
| Other incomplete zero-hit result | No matches returned; coverage is incomplete. |

No-scope mixed pending/terminal and retryable non-preparation-only results use
`No content could be searched.` Cursor variants use the page-qualified row.
No new retry command is constructed from resolved scope targets: the copy tells
the caller to retry eligible requested targets with their query, without a
cursor; original continuation retains exactly the original ordered operands.

## Plan review disposition — 2026-10-19

Internal direction clean; accepted zero-scanned CURRENT + FAILED schema case.
External round 1 direction sound. F1 accepted: explicitly dev-only qualitative
eval, fixtures prove errors. F2 accepted: precedence table above. F3 rejected:
per-scope global negatives require proof COMPLETE means no truncated hits, which
has not been established; result pages can be continuations and the formatter
receives no original request/cursor. Keep existing conservative source claims
and avoid expanding scope to request plumbing. F4 rejected as proposed: replaying
all original operands invites unchanged retries of terminal targets, contrary
to the explicit user requirement. Target-selective prose needs no constructed
command and preserves continuation order separately. F5 accepted: omission
spacing and punctuation correction in the existing formatter. No product or
architecture decision remains.

External round 2 is clean after minor doc fixes: current base recorded and the
no-native-scope precedence row clarified. Draft production changes began after
round 1 plan clarifications were applied; round 2 brief was stale on that point.
No third plan round is required for these wording-only fixes.


## Implementation evidence

- Implemented only shared text selection/recovery and the directly affected
  tests/docs; JSON/API, descriptors, request behavior and match rendering unchanged.
- Final focused command (7 files named in verification above): 106 passed,
  0 failed, 935 assertions. New matrix reproduced 15 failures before the fix.
- `bun run build`, `bun run typecheck` and Biome checks for six changed TS files pass.
- Internal code review direction sound, no code findings; accepted one docs
  correction so all fresh-retry guidance selects only eligible requested targets.
- Both initial development smoke runs passed isolated auth checks but failed
  the scoped live credential probe before grep. Host development pkg info works;
  authenticated retries using a privately piped development token pass:
  CLI 168 steps, MCP 86 steps. No credential was printed or persisted.
- Targeted development `code-grep-investigation` agent eval process/final success;
  high confidence, 6 logical MCP calls (2 grep, 3 read, 1 quick_start), no CLI
  fallback or validation violations. No isolation-violations file emitted; report
  validationViolations is empty. Metrics and final/tool calls inspected. This is
  normal-path qualitative evidence, not graded quality or failure-state proof.
- Healthy mixed-100 and repository-100 outputs remain byte-identical (6967/5754
  bytes). Synthetic pending: 149 -> 140 bytes; terminal-only: 96 -> 109;
  mixed empty: 307 -> 326; native retryable failure: 350 -> 374; partial hits
  plus retryable failure: 558 -> 570. The necessary qualifications/new retry
  actions add bytes in failures; no claim of runtime or measured token savings.
- External implementation review, final smoke results and PR delivery pending.


## Implementation review round 1 closures

Direction sound; accepted F1-F5 (two code findings, two doc corrections, comma).
F1 -> competing fresh-subset action beside an expired-cursor restart -> scanned
all retry/cursor branches and related tests/docs -> suppress selective retry
footer for CURSOR_EXPIRED; retained evidence and explicit full restart remain.
F2 -> overly broad suppression of overall traversal limits -> checked stale,
binary/oversized skips, file issues/omitted counts with hits and optional cursor
-> suppress only when native traversal/readiness failure attributes the limit;
otherwise retain the overall notice. Added deterministic regression coverage
for both failure classes in CLI/MCP syntax. F3/F4 -> stale sibling guide and
narrow no-scope wording -> corrected unified-grep and search-snapshot docs.
Comma clarifies that removing the cursor applies to the retry action.
No new ownership or infrastructure; all fixes remain in the existing formatter.

Revised full delta internal re-review is clean. Focused105 tests/887 assertions,
root build/typecheck and six-file Biome checks pass. Existing healthy fixtures
remain byte-identical after review fixes; counts above include the comma.


Round 2 verified every prior finding closed and raised one low polish finding:
omission attribution remained coupled to unrelated page gaps via omissionsOnly.
Accepted: generic warning now independently recognizes omissions for non-failed
traversal; overall FAILED remains disclosed. Sibling scan covered the complete
caveat predicate, Preparing/Omitted branches, zero-hit precedence and both
presentation docs. Added pending/terminal × binary/stale × partial/failed ×
CLI/MCP regression cases retaining hits/read locators. Shared formatter ownership
remains correct; no new abstraction or infrastructure. Revised106 focused tests
pass with935 assertions; build, typecheck and affected-file Biome checks pass.
