# Grep preparation error classification

Status: IMPLEMENTED; final review in progress. One implementation increment; no product decisions or
unknowns remain. Dependency: existing shared grep mapper and backend envelope.

## Outcome and verified evidence

CLI JSON and MCP must distinguish target failures from in-progress preparation.
`mapGrepError` currently labels every `GREP_TARGET_PREPARATION_REQUIRED` INDEXING
and emits raw reason hints. Both callers add wait guidance for retryable INDEXING.
Verified against CLI origin/main 88ede54 and PkgSeer origin/main 8159ac80b:
`lib/pkg_seer/public_error/grep/preparation_copy.ex`,
`lib/pkg_seer/grep/preparation.ex`, `lib/pkg_seer/grep.ex`, documentation inventory,
and `docs/implementation/ERROR_CODES.md`. Backend copy describes the first issue;
structured issues retain all published blockers (at most twenty).

## Scope, ownership, and contracts

The shared MCP mapper owns error classification for both surfaces. Keep the pure
classification local to that module; no new services, dependencies, infrastructure,
network selections, retry loops, or caller constraints. PkgSeer and consumer repos
are read-only. Preserve backend top-level retryability, GraphQL code, message,
and the existing bounded/public projection of target issues unchanged.

Classify every incoming issue before the existing public-detail bound. Choose the
first non-INDEXING issue in backend order, otherwise INDEXING for a nonempty list only when top-level retryable is not false.
A false aggregate retryable with only published progress issues falls back to
UNRESOLVABLE: backend truncation can hide a terminal blocker.
Missing/empty/malformed issues fall back to UNRESOLVABLE. Known progress reasons
repository_indexing and documentation_publishing qualify unless retryable is
explicitly false. Known non-progress reasons remain non-INDEXING even if retryable
and carrying progress metadata. Unknown reasons qualify only with issue.retryable
=== true and a nonblank string progress_ref; otherwise UNRESOLVABLE.

| Reasons | Code |
| --- | --- |
| repository_indexing, documentation_publishing | INDEXING (unless explicitly nonretryable) |
| repository_not_found, package_not_found, package_source_not_found | NOT_FOUND |
| repository_ref_not_found, ref_not_found | REF_NOT_FOUND |
| package_version_not_found, package_version_unresolved, package_source_ref_not_found | VERSION_NOT_FOUND |
| repository_ref_ambiguous, site_ambiguous | INVALID_ARGUMENT |
| repository_resolution_error, repository_unavailable | BACKEND_ERROR |
| no_grep_scopes, no_site_pages, repository_legally_blocked, package_source_unsupported, package_security_removed, package_scope_unavailable, package_release_unusable, site_not_indexed, site_no_docs, site_redirected, site_failed, documentation_site_not_admitted, documentation_source_resolution_required, documentation_site_no_docs, documentation_site_identity_blocked, documentation_site_failed, site_v6_required, documentation_discovery, starting_url_pending, starting_url_missed_at_cap, starting_url_absent_from_current_corpus | UNRESOLVABLE |

Dedicated version/ref recovery envelopes retain their existing mapping before
this classifier. Human hint rows use known-reason translations or issue messages,
with a neutral unknown reason; omit diagnostics already carried by the top-level
message and avoid duplicating single-target backend diagnostics. Preserve path
facts. Keep success/unavailable-target use of the shared reason formatter coherent.

## Implementation increment

Status: IMPLEMENTED. Expected outcome: agents receive actionable codes and no raw
preparation reason in prose. Assumptions: backend ordering is stable (verified in
preparation/error construction); unknown future reasons remain open strings;
retryability is authoritative. Unknowns/product decisions: none.
Dependencies: shared mapper, existing command/tool service factories.

1. Add mapper regression coverage for each known reason family, progress-only,
   mixed ordering, unknown reason with/without progress, explicit false, and
   missing issues, and a backend-truncated progress-only list with aggregate false. Preserve structured facts and retryability in assertions.
2. Classify reasons in the shared mapper; remove redundant reason-only hints and
   translate remaining diagnostics in grep-preparation-text. Correct old fixtures
   that treated package_source_unavailable as an indexing reason without progress.
3. Cover CLI JSON and MCP JSON routing for progress, terminal families, mixed and
   unknown cases, including wait guidance appearing only for INDEXING + retryable.
4. Preserve additional hint/path facts in mapped-error-text version/ref rendering,
   covering multi-target CLI and MCP text. Update unified-grep.md as the owner of
   classification rules and tools.md as its summary/link. Update tools.md and a new changes fragment: patch for githits and @githits/mcp;
   no version bump outside release preparation, no minor bump. Audit consumer code.
5. Run `bun test packages/mcp/src/shared/grep-error-map.test.ts
   packages/mcp/src/shared/grep-text.test.ts packages/mcp/src/tools/grep.test.ts
   src/commands/grep.test.ts`, typecheck, changed-file formatting/lint, build,
   `bun run smoke:cli` and `bun run smoke:mcp`. Run a targeted local agent eval
   for grep behavior and inspect call/final/metrics/isolation artifacts.
6. Dev-smoke built CLI with inherited token and endpoint overrides unset against
   nonexistent repository and nonexistent express ref, preserving backend facts;
   record the actual envelope (dedicated ref recovery or preparation required).
   Also smoke a multi-target preparation error.
   Never print, inspect, capture, or pass credentials.
7. Internal preflight and one external reviewer per round until clean. Commit,
   push, draft PR, watch CI. No merge/tag/release/publish.

Acceptance: reason-derived codes and token-efficient hints on both surfaces;
focused checks and dev smokes demonstrate the two reported failures; consumer
audit and release impact appear in PR. No optimization claim; benchmarks are
inapplicable to this classification fix. Rollback is a normal revert.

## Completion and cleanup

Record actual checks, smokes, review, and consumer audit. Durable classification
rules belong in docs/implementation/unified-grep.md, linked from tools.md. After the last increment's review
is clean, delete this plan in a final commit before PR delivery. No deferred
items or refactors identified; reassess if evidence changes scope or ownership.

## Plan-review closure (2026-10-22)

- F1 rejected: removing progress/unknown classification would violate the user's
  explicit requested contract and tests. Backend currently sends progress/doc
  issues in success unavailable_targets; document that routing without removing
  requested compatibility behavior. Dedicated recovery mapping stays untouched.
- F2 accepted: version/ref text early return drops hints; fix shared renderer and
  assert mixed-target text through both surfaces. No recovery-field expansion:
  backend message already includes available/suggested refs.
- F3 accepted: unified-grep.md owns the table; tools.md summarizes and links.
- F4 accepted: retryable repository_resolution_error/repository_unavailable use
  BACKEND_ERROR, preserving authoritative backend retryability.
- F5 accepted: backend ref advanced externally to 8159ac80b with no grep changes;
  updated citation and record actual smoke envelope, plus multi-target replay.

- F6 rejected for this scope: the hand-off explicitly identifies repository_indexing
  and documentation_publishing as the known INDEXING whitelist. Backend also marks
  documentation_discovery/site_v6_required/starting_url_pending pending in successful
  omission records; those are documented known reasons, not unknown future reasons.
  A broader whitelist was offered as an optional user choice, not required for the
  fix. Keep the requested two unless the user opts into expansion. This does not
  alter current success omission behavior, which is not classified by this mapper.

## Validation and consumer audit

- Focused mapper/formatter/CLI/MCP tests: 128 pass, zero fail (681 assertions).
- Related version/ref recovery/terminal tests: 70 pass, zero fail.
- `bun run typecheck`, `bun run build`, changed-file Biome and diff whitespace pass.
- Dev `bun run smoke:cli` and `bun run smoke:mcp` pass with
  `GITHITS_AUTH_STORAGE=file` and inherited token/endpoint overrides unset. Empty
  temporary homes correctly skip authenticated cohorts with AUTH_REQUIRED. Initial
  default keychain runs failed because system keychain is unavailable under the
  isolated temporary HOME; verified with a single package-auth probe. No credentials
  copied or stored to make the suites pass.
- Built CLI authenticated dev replays, inherited token/endpoint overrides unset:
  missing repository -> NOT_FOUND/false with GREP_TARGET_PREPARATION_REQUIRED,
  issue preserved, no duplicate hint; Express nonexistent ref -> dedicated
  REF_NOT_FOUND/false with indexed refs; two missing repositories -> NOT_FOUND/false,
  both issues retained and one readable extra-target hint. Nonzero exits expected.
- Targeted `bun run agent:e2e` with a neutral missing-repo workload and intent
  profile attempted: isolated Claude reports Not logged in before any tool calls.
  tool-calls empty; final/isolation artifacts absent, metrics unknown. Retried with
  the documented existing Codex eval home (no credential reads/injection): harness
  success, one quick_start and one grep call, no retry loop. Final answer reports
  Repository not found and advises correcting target; final.status failure is
  expected for an impossible target, confidence high. No isolation violations
  artifact. Metrics: 27.5 seconds, 2 logical calls, 24845 uncached input tokens,
  59136 cached input tokens, 543 output tokens; cost estimate $0.00334736. No
  usefulness grade is claimed.
- Remote MCP currently imports @githits/mcp ^0.35.0 (no longer a CLI delegate).
  No grep-specific INDEXING dependency. Hosted rollout needs normal package release,
  dependency update and deployment, outside this PR's authorized delivery.
- Public API directly validates the backend envelope in
  src/upstreams/pkgseer/grep/errors.rs; does not consume CLI mapped code.
- Public skills inspected: no stale grep preparation error-code guidance to update;
  no skill/manifests changes. Patch fragment for both artifacts; no minor bump.
- No major deferrals, new infrastructure, or refactoring opportunities identified.

Final plan round (third) dispositions: accepted A (targeted Codex eval completed using
existing authenticated eval home, without credential inspection/injection);
accepted B (durable two-reason rationale now in unified-grep.md). Plan round limit
reached; no further plan review. Code has its own final review after validation.
