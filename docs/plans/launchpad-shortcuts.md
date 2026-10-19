# Launchpad shortcut client admission

Status: IMPLEMENTED; verification passed, code review pending. One implementation increment on current main `233b9c2`.

## Outcome and verified evidence

CLI and local MCP accept the deployed backend's four mutable Launchpad address
forms: `PROJECT`, `DISTRO/+source/SOURCE`, `~OWNER/PROJECT`, and
`~OWNER/DISTRO/+source/SOURCE`. The caller need not find the current Git owner.

Backend phase 2B owns live `getByPath` acquisition. Its pure input normalizer
accepts these forms over HTTPS; native/stored identity and snapshot formatters
still require complete owner-qualified `+git/REPO` paths. Short Git-transport
URLs are explicitly rejected; existing complete Git-transport roots remain valid.

A cleared-environment dev invocation of current-main `list lp:beautifulsoup`
returned CURRENT and canonical repository
`https://git.launchpad.net/~leonardr/beautifulsoup/+git/beautifulsoup` at
`c772c5e6b335c1dbd8ee59a01ea6b75b272cd737`. At baseline the search/diff parser
rejected short input, and the special list error wrongly said unsupported.
PR #494 is merged; this is a new follow-up PR, with no history rewriting.

## Design and assumptions

The existing shared repository parser owns lexical admission and URL-only
translation. Add one pure default-path validator; use it only for HTTPS input.
Keep output URL/identity parsing strict so a short request is never presented
as a canonical owner. Typed output labels must also pass canonical URL validation;
leave short correlation labels unformatted rather than inventing an identity.
Expose canonical URL classification from this shared grammar so resolve keeps
passing mutable defaults to backend exact acquisition, while complete identities
still bypass fuzzy resolution. No resolver, HTTP call, cache, dependency or backend edit.
Remove the obsolete shortcut error class and list-specific error remapping;
backend errors supply the actual missing/private/provider failure diagnosis.

Verified assumptions: prefixes are case-insensitive, path/ref case is identity,
first raw `@` splits the ref before decoding, defaults use the existing namespace
character rules, backend output remains owner-qualified and replayable. Preserve
all existing package and other-provider parsing. No product decisions remain.
Production list qualification returned CURRENT Beautiful Soup at the same SHA.
Further production qualification uses read-only calls. Verify separately
using production credential selection, without deploying or handling tokens.

## Increment and acceptance

1. Add red tests for all four default paths, prefix variants, both HTTPS hosts,
   refs/escaping and URL-only search/diff/legacy-read service arguments. Retain
   negatives for unsafe paths, incomplete Git roots, short Git transport, bad
   hosts/ports, and strict canonical output formatting, including short labels
   with and without an acquired canonical repository URL. Resolve preserves
   defaults while rejecting complete identities; include ref-recovery coverage.
2. Extend the shared parser and remove obsolete error plumbing/tests. Update
   parser/diff errors, CLI help, MCP argument descriptions, stable-guide copy, implementation docs, dependency backlog and
   a new independent fragment (minor impact for CLI and MCP; no version bump).
   Public CLI skill changes describing unreleased behavior stay release-gated.
3. Run focused parser/request/CLI/MCP/parity/guide/release tests, typecheck,
   build, plugin generation/check and source CLI/MCP smoke. Use the revised
   `eval/agentic/probes/launchpad-navigation.md` shortcut agent probe and report authentication limits honestly. CI covers
   the full suite; do not alter process deadlines for unrelated startup flakes.
4. Built CLI dev matrix: the four default shapes across Beautiful Soup and
   Ubuntu hello, positive list/read/grep, CODE/SYMBOL search, canonical exact-SHA
   read-action replay, equal diff and truthful unequal raw-diff failure. Verify
   built stdio MCP list/read/search/diff and selected production short-form
   navigation and exact resolve. Include a missing-ref check; preserve backend
   recovery facts, and do not guess identity equivalence for retry actions.
   Preserve JSON correlation echoes; format canonical display labels only.
   The PR stays draft; production qualification is required for advertising.
5. Internal pre-flight and fresh external review to clean; commit, push, open
   a draft PR, and inspect CI. No merge, tag, release or deployment.

## Completion

Replace projections with evidence, transfer the final addressing contract and
qualification to implementation docs, retain real release dependencies in the
backlog, then delete this plan in the PR's final commit after clean review.

## Plan review closure

Round 1 direction sound. Accepted the resolve regression: parser admission must
not remove the deployed backend exact-default lookup. Canonical URL validation
is the shared classification boundary, used by resolve and output formatting.
Production baseline passed; remain draft by user instruction. Added missing-ref
qualification and exact help/schema/probe inventory. Backend labels observed in
list are already canonical; no canonical-substitution fallback is justified, so
short correlation labels remain unformatted. No new infrastructure or scope.

Missing-ref evidence: dev `list lp:beautifulsoup@4.15.O --json --limit 1`
returned REF_NOT_FOUND, canonical repoUrl, requestedRef 4.15.O, available HEAD,
and no suggested refs. Preserve these facts; no client guessed recovery action.

Round 2 minor closure: changed the existing Launchpad navigation probe from
complete URLs to lp:software-properties and lp:ubuntu/+source/hello, retaining
pinned SHA and canonical citation/replay requirements; updated its README entry.
Red tests will be formatted with the completed implementation before commit.

## Implementation and verification evidence

- One pure HTTPS-only default validator plus canonical URL predicate; resolve
  passes defaults to backend exact lookup. Output labels stay canonical-only.
- Removed obsolete shortcut error/remapping. Invalid Launchpad path guidance
  is now two short sentences. No resolver, HTTP client, dependency or new API fields.
- Focused: 568 tests/7 files and 237 tests/10 files passed. Full `bun test`:
  6,442 pass, zero fail across 245 files in 39.35s. Typecheck/build passed.
- Plugin generation/check and source CLI/MCP smoke passed; source live cohorts
  skipped AUTH_REQUIRED in isolated homes, separate normal-profile built checks
  authenticated normally. Public-package validation passed.
- Built CLI dev: four shapes, list/read/grep/CODE/SYMBOL/exact resolve/replay;
  equal diffs through compact and URL-only adapters, truthful unequal raw failure.
  Built MCP: list/read/replay/grep/CODE/SYMBOL/resolve/equal/unequal/bad-ref.
  Production: Beautiful Soup and hello short list/symbol search CURRENT/pinned.
- Read top-level repoUrl echoes request address; served resolution carries
  acquired owner/SHA. Verification now follows that existing JSON contract.
- Revised Codex descriptor probe: authenticated resolve/search/read replay,
  25.0s, nine MCP calls, neutral canonical citations/high reported confidence.
  Recovered two wrong-argument resolve calls. No isolation artifact emitted.
  No independent quality grading or performance claim.
- Plan R1 resolve finding accepted; R2 only minor probe/doc gap, fixed and
  internal rereview clean. Plan reviewer released and terminal closed.

A missing public project returned nonretryable BACKEND_ERROR with underlying
REPOSITORY_NOT_FOUND in details.graphqlCode and concrete typo/public-access
guidance. Existing mapping and all backend facts are preserved. Internal
implementation preflight reviewed full delta clean, including backend grammar.

## Implementation review round 1 closure

Direction sound. F1 accepted (low): search ref-alternative composition reused
the permissive input parser, allowing a newly composed mutable URL retry. Root
invariant is output identities must be canonical. Added the existing predicate
to composeRepositoryTarget plus red/green short-prefix/short-HTTPS/canonical
Launchpad/GitHub tests; alternatives remain visible, short inputs get repository-fix
guidance. Bounded sibling scan: all shared parser consumers, target label
formatting, source-provenance/target-resolution and direct repository format
calls. Remaining parser sites classify/extract refs; snapshot formatting uses
backend served identities, version-ref retry requires matching canonical URL.
F2/F3 accepted: corrected cli-commands' two stale paragraphs/example and the
removed advertising-gate reference. Scanned docs/src/MCP for that stale wording.
No new resolver, fallback or infrastructure. Reverification passed: 719 tests/6 files, typecheck/build, source CLI/MCP
smokes (unauth contracts; live AUTH_REQUIRED skips). Built missing-ref search
returned canonical repository/ref guidance without composed short retry.
Round2 review pending.

Production owner/project and owner/distribution-source HTTPS list checks also
passed CURRENT canonical resolution, completing all four default shapes in
production. Internal round2 preflight has no code findings; its one trailing
space note is fixed.
