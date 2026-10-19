# Launchpad CLI and MCP target support

Status: IN REVIEW; implementation and focused live verification complete. One implementation increment; no open product decisions.

## Outcome and verified evidence

Fully owner-qualified Launchpad Git targets work through the built CLI and local
MCP alongside GitHub, GitLab, Codeberg and registry-native packages. Canonical
compact output is `launchpad:`; input also accepts case-insensitive `lp:`.

The branch was fetched and fast-forward checked against `origin/main` on
2026-10-19 before exploration (already current). The shared
`packages/mcp/src/shared/repository-target.ts` provider table currently admits
only the other three providers. Search, diff and file-read presentation use
that parser. Unified read/list/grep transports preserve compact targets, while
search/diff and legacy navigation use structured URL-only service arguments.
`src/tools/repository-target-parity.test.ts` already tests these seams.

Read-only backend evidence: CodeAddress, its tests, Provider public-input
normalization, Provider.Launchpad, ReadRequest and RepoPageId. They establish:

- Three paths: `~OWNER/+git/REPO`, `~OWNER/PROJECT/+git/REPO`, and
  `~OWNER/DISTRO/+source/SOURCE/+git/REPO`.
- Canonical HTTPS `git.launchpad.net`; HTTPS `code.launchpad.net` roots and
  `git://git.launchpad.net` (default port 9418) normalize to it. No SSH or HTTP.
- Namespace segments begin alphanumeric, then allow alphanumeric/`+._-`;
  repository segments additionally allow literal `@`, and reject `.git` suffixes.
- Split the first raw path `@` before decoding repository components; preserve
  later `@` and `/` in refs. Decode components once, reject encoded separators,
  unsafe characters and malformed escapes; compact output escapes repository `@`.
- Read page IDs encode ref/path components and must pass through unchanged,
  including semantic fragments. The backend owns their classification.
- Mutable project/default shortcuts remain unsupported. Fuzzy resolver package
  suggestions do not establish exact repository identity.
- Unequal raw diff returns nonretryable `RAW_DIFF_UNAVAILABLE`; equal-SHA diff
  returns a complete empty inventory. No raw-diff parity or upgrade-safety claim.

## Ownership, scope and assumptions

The existing shared repository parser owns compact-to-structured translation
because both adapters already depend on it. Extend its provider entry and the
small provider-specific normalization needed for verified Launchpad grammar;
do not add command-specific admission patches. Extend ProviderGrammar with optional
prefix aliases, input-host aliases and a Git-transport allowance; Launchpad alone
supplies them. Keep `git://` recognition scoped to the Launchpad Git host, including
invalid-port inputs that must be rejected, so other-provider classification stays
unchanged. Decode Launchpad components after splitting the first raw `@` and before
its path validator; other providers keep raw validation. Use an internal target/URL
parse mode for formatting structured repository URLs without ref splitting; escape
repository `@` only when composing compact output. No generic hook system is needed
for this single verified provider difference. Keep other providers' current
grammar unchanged. Formatting must handle canonical URLs containing literal
`@` without mistaking them for compact ref delimiters.

Update CLI help, MCP argument examples/guide, replay classification and durable
repository-target docs where explicit provider enumerations would exclude
Launchpad. Keep the stable quick-start and public MCP skill copy aligned;
other public CLI skill updates wait for release under the existing lifecycle.
Add one fragment declaring minor impact for `githits` and `@githits/mcp`;
do not bump versions or edit CHANGELOG.

Assumptions: backend contract is deployed as reported in the handoff; verify
actual dev behavior with the built CLI. Existing stored dev authentication may
be available; use normal CLI auth only, never inspect or print credentials.
No performance optimization is proposed, so no benchmark claim or run is needed.
Unknowns: actual live readiness/auth and exact replay locators; resolve during
verification using returned evidence, not invented actions. Product decisions: none.

Non-goals: backend/native/other-lane changes, default acquisition/API lookups,
project-only or `.git` support, new dependencies/infrastructure, merge/release.

## Phase 1 — shared admission and truthful replay (IN REVIEW)

Expected outcome: complete Launchpad inputs reach the correct existing service
boundaries; emitted actions replay without corruption and limitations stay visible.
Assumptions and unknowns: as above. Dependencies: current shared parsers and
deployed backend; no new dependency.

1. Add regression cases to repository parser/formatter and existing consumer
   parity tests. Prove all three shapes, canonical and mixed-case lp prefixes,
   browse/git URL forms, case, encoded `@`/components, first-`@` refs, negatives,
   URL-only search/diff arguments, byte-preserved read/page-ID/list/grep actions,
   and unchanged provider/package behavior. Resolver tests assert complete paths are
   canonical (local rejection as unnecessary resolution), while deferred short
   forms still reach fuzzy resolution. Keep other-provider `git://` unrecognized. Observe focused failures first.
2. Extend shared admission/formatting; inspect explicit provider branches in
   recovery/help/schemas/examples and correct verified siblings only: the
   indexing-estimates-text.ts repository regex, repository-target.ts and
   code-diff-request.ts errors, CLI search/resolve/code files/read/grep/diff help,
   MCP resolve-target/code-navigation/search argument examples, and
   code-navigation-target.ts JSDoc. Replace the behavioral regex with shared
   repository recognition; add its Launchpad regression test.
3. Update permanent docs, guide parity and release fragment; generate/check
   canonical plugin assets and inspect generated delta. Update
   docs/implementation/repository-targets.md, cli-commands.md, tools.md and mcp-cli-parity.md;
   packages/mcp/src/mcp/instructions.ts and skills/githits-mcp/SKILL.md stay
   exactly aligned. Record delayed githits-code skill/reference updates in
   docs/backlog.md for the release lifecycle.
4. Run focused parser/parity/affected adapter tests, typecheck, build and public
   package validation. Run `bun test` and required `GITHITS_ENV=dev bun run
   smoke:cli` / `smoke:mcp` suites. No smoke-launch behavior changes planned.
5. Exercise `GITHITS_ENV=dev node dist/cli.js` on software-properties, apport
   and distribution-source GNU hello at handoff SHAs: list, grep, bounded read,
   CODE/SYMBOL Discovery and an actual unchanged emitted action. Include mixed
   lp spelling, equal raw diff and clean unequal RAW_DIFF_UNAVAILABLE. Inspect
   readiness, positive hits and served SHA. Personal paths use isolated tests.
6. Add eval/agentic/probes/launchpad-navigation.md and its README entry;
   run it with `agent:e2e --server local --guidance-profile descriptors`;
   inspect tool-calls, final answer/confidence, metrics and isolation violations.
   Use existing harness; no new proof harness. Report auth/quality limits honestly.
7. Internal pre-flight then one external Claude reviewer per round under the
   review loop. Fix valid findings and re-review code findings to clean (three
   external rounds maximum). Commit stable verified changes, push and open a
   draft PR. Stop before merge/release.

Acceptance: all behavior above is tested at the owning boundary and exercised
where live fixtures exist; no compact strings enter URL-only GraphQL fields,
no deferred defaults are claimed, errors remain truthful. Tests/build/package
checks pass or material blockers are explicitly reported. Reviewed draft PR
contains only this lane's public-safe changes.

## Completion and reorientation

This is the final increment; no later phases. If evidence contradicts the
contract, report it and reorient before expanding scope. After clean review,
transfer final behavior/verification and release skill follow-up to permanent
docs or the backlog, then delete this plan in a final commit in this PR.
Retain the implementation reviewer through human merge approval.

## Plan review closure

Internal pre-flight: direction sound, no findings. Claude round 1: direction
sound; accepted F1 parser precision (explicit aliases/hosts, scoped transport,
decoding and URL formatting), F2 sibling inventory, F3 resolver seam, F4 named
probe. All are clarifications within existing scope; no added infrastructure.
The proposed generic decode/format hooks are unnecessary for one provider;
keep that distinction in the existing shared parser. Added resolver/grammar/
consumer test cases. Pre-change parser run: 238 pass, 44 fail. Consumer red run
reproduces unsupported registry launchpad. Dev baseline unified list succeeds
with CURRENT state on software-properties at the handoff SHA. Unequal diff
second endpoint remains a live-evidence unknown (existing receipt names 0.100).

Claude plan round 2: clean after minor text clarifications, applied here. Cover
literal-@ structured URLs in the formatter and both label branches; decode
negative unsafe/whitespace, doubled/trailing slash, Git URL userinfo, host-case
and explicit-port cases. `git://` URL hosts require explicit case normalization
and default-9418 handling (WHATWG URL retains that port and host case).
No new legacy MCP skill hash entry is needed for the stable-guide edit.

Implementation verification found a shared error-mapping contradiction: the
service retained RAW_DIFF_UNAVAILABLE, but classifyCodeDiffError converted it
to BACKEND_ERROR. Equal-SHA live diff already passed. Preserve the specific
nonretryable code in the existing shared mapper/union (no capability mechanism),
with mapper and CLI/MCP parity regressions retaining resolved endpoints. Red
run: 59 pass, 2 fail. This is required by the original truthful-diff acceptance.

Current evidence: focused target/adapter/guide tests 630 passed; complete unit
suite 6,147 passed before the final raw-diff code fix; 61 mapper/diff parity
cases passed after it. Final complete suite after the error-mapping fix: 6,148 passed, zero failures. Typecheck, build,
public-package validation, format check, plugin generation/check passed.
Built CLI dev checks: all three named fixtures CURRENT, exact reads, positive
grep/CODE/SYMBOL and unchanged emitted actions; built MCP passed hello and
both raw-diff cases. Unsupported defaults rejected. Isolated source smoke suites
passed unauthenticated contracts using empty file auth; authenticated cohorts
could not use the Keychain under temporary homes. Targeted agent probe attempted
canonical Launchpad search after quick_start, then AUTH_REQUIRED; final
inconclusive/medium, two MCP calls, 52.1 s, no isolation-violation artifact.
Detailed behavior/verification moved to repository-targets.md; release-only
CLI skill/reference work recorded in docs/backlog.md. No runtime work deferred.

Implementation review round 1: direction sound. Accepted F1 static capability
wording -> backend owns availability -> inspected both diff descriptors/help,
removed static Launchpad availability sentences; retained observed dated docs,
runtime typed error and generic safety wording. Accepted F2 unreachable guards
-> shared recognizer already certifies Git host -> inspected recognizer, parser
port logic and negative/positive transport tests; removed repeated allowGit/host
checks, retaining explicit port validation. Accepted F3 incomplete provider
lists -> scanned directly related CLI diff help and implementation docs ->
updated --repo-url help plus both missed cli-commands.md sentences. Applied
optional table-order and fragment wording nits. No new mechanism or scope.
Focused parser/adapter/diff/help tests and checks rerun before round 2.
