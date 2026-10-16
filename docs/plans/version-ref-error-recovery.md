# Version and ref error recovery

Status: coordinator round 2 fixes implemented and locally verified; re-review pending.

## Outcome and scope

VERSION_NOT_FOUND and REF_NOT_FOUND preserve typed backend recovery facts in
CLI/MCP JSON, and render one concise identity/suggestion block plus a native
next step in text and JSON. Cover package intelligence and code navigation consumers;
check code-diff consistency. Validation, grep target_issues and indexing are
out of scope. Unknown codes and incomplete recovery fields keep backend prose.

## Verified evidence and assumptions

- The catalogue defines available_package_versions as registry strings and
  available_versions as indexed {ref, version} records. No current catalogue
  shape sends available_versions as strings. Package intelligence reads the
  wrong field today; navigation already reads the indexed records.
- Live production Go deps drops the structured +incompatible suggestion in
  JSON. Ref read retains tags but text repeats broad corrective guidance.
- Live npm deps has no suggestions in its message, unlike the brief's
  packageInfo example. Use actual responses in evidence; never fabricate them.
- pkg info is latest-only; resolve rejects canonical targets locally. Preserve
  these verified contracts rather than adding version inputs.
- Assumption: producer ordering is authoritative (catalogue shared convention).
- No open product decisions or additional infrastructure is required.

## Ownership and design

Core services own decoding typed recovery fields. A small shared core parser
retains registry and indexed suggestions as distinct facts; existing typed
errors carry them without knowledge of CLI or MCP wording. The MCP package owns
shared human error presentation and pure action builders. CLI supplies its real
argv; MCP tools supply their real name and arguments. This avoids making service
clients know command syntax and avoids threading every CLI option through error
handlers. Existing DI, requests, and success formatting stay unchanged.

JSON keeps backend prose and complete structured recovery lists, plus the native
action when the invocation has a matching operand. Text rewrites
only when identity fields are complete, lists suggestions once, and selects the
first producer suggestion. Missing fields and unknown codes fall back without
inventing versions, refs, or retry commands. Quote shell operands and keep
copyable actions intact; wrap prose to caller width.

## Single phase

Dependencies: existing service interfaces, shared mapped-error formatter, CLI
and MCP boundaries. Unknowns: none blocking; live responses may vary over time.

1. Capture before CLI/MCP text and JSON from production using CLI-managed auth.
2. Add typed parsing, mapping, shared text and surface-native recovery actions.
3. Add isolated parser/formatter/command/tool tests, including malformed fields,
   unknown codes, producer ordering, duplicate avoidance and JSON preservation.
4. Document durable behavior and add a patch fragment for both public artifacts.
5. Run focused tests, bun test, build/typecheck and both smoke suites. Run a
   targeted agent:e2e workload if the local harness is available. Compare the
   exact four evidence cases' before/after text character counts; no runtime
   performance claim or broad performance benchmark is planned.
6. Commit, push, open a draft PR; monitor checks and supply the coordinator's
   review packet. Keep this plan through coordinator review. After review is
   clean, transfer remaining durable facts and delete it in the final PR commit.

Acceptance: correct field semantics, native actions that preserve caller
controls, one suggestion list, lossless JSON facts, safe fallback, tests/build
and smoke suites pass, draft PR has green checks and measured evidence.

Rollback: revert the PR. No migration, configuration, auth or fetch selection
changes. No optimization claim. Refactoring opportunity: remove the duplicated
pkg vulns/deps/changelog version-error renderers as part of the shared formatter.

## Observed completion evidence

- 5,886 unit tests passed after round 1 fixes; focused recovery, service propagation and actual-tool
  boundary tests pass. Typecheck, build, changed-file lint, plugin checks and
  public-package validation pass.
- Normal smoke invocations hit an unavailable isolated system keychain.
  Supported GITHITS_AUTH_STORAGE=file reruns pass auth handling and explicitly
  skip empty-home live cohorts. Direct production CLI/local MCP captures cover
  all four planned errors in text and JSON; authenticated smoke definitions now
  assert Go registry-version and repository-ref recovery.
- Output character counts (CLI / MCP): npm deps 164 -> 119 / 119 -> 119;
  Go deps 185 -> 129 / 122 -> 137; ref read 440 -> 188 / 398 -> 186;
  ref list 361 -> 178 / 361 -> 186. Full text and judgments are in
  the PR #485 description.
- Codex targeted descriptor-only eval succeeded with 10 logical MCP calls,
  79.4 seconds, high-confidence neutral final answer and zero validation
  violations. Claude could not start tool use because its isolated session was
  not logged in. No quality grade is claimed.
- A pre-existing packaged guide mismatch caused two baseline unit failures.
  Main independently fixed it in 004c82f. Merged main without rewriting history;
  the final PR has no separate guide delta or duplicate repair fragment.
- Nullable version associations belong to recovery records; success-result
  types stay unchanged. JSON contains complete backend facts and surface-native action prose.
- No implementation work is deferred. External review and plan deletion remain
  the coordinator-owned final steps; keep the plan until review is clean.

- Initial PR CI rejected three optional constructor fields during MCP declaration
  generation (TS9025), despite local package validation passing. Explicit
  VersionRefRecovery | undefined defaults match existing constructor patterns;
  the MCP declaration build, publish-validation command and 144 focused tests
  pass after that correction. The command skipped npm's publish dry run because
  @githits/mcp@0.30.0 is already published; artifact validation still ran.

- Recovery now normalizes surrounding target whitespace before replacing the
  suffix, matching request builders. Regression tests cover padded repository
  and package targets; the final local full suite passes 5,875 tests.

## Coordinator review round 1

All five findings are accepted and verified against code:

1. Repository-snapshot misses with tag suggestions must pass backend prose
   through, without selecting an older indexed version. Registry alternatives
   and snapshot-only indexed alternatives retain recovery.
2. Coordinator decision: JSON includes native actions on both surfaces, including
   the CLI search error path. Backend facts and prose stay complete.
3. Match the accepted CLI grammar: grep -s and combined switches, root --no-color,
   unversioned upgrade-review operands and canonical package casing.
4. Append an inventory to passthrough prose only for code-diff side/stage context.
5. Remove legacy navigation recovery branches and duplicate error-constructor
   fields. These private errors now carry one normalized recovery record.

Regression tests cover each case. Permanent docs record the new behavior; live
before/after evidence lives only in the PR description. The npm evidence records
that reachable package surfaces currently provide suggestions only for Go;
PkgSeer owns the backend fix and this client PR does not implement it.

Round 1 verification: 5,886 unit tests pass, as do typecheck, both package builds,
changed-file lint, plugin checks, public-package validation, source CLI/MCP
smokes (file-storage auth handling), and built Node CLI/MCP smokes. Fresh
production captures confirm native JSON actions on Go and repository-ref errors
on both surfaces; all four text outputs and measured lengths are unchanged.
The targeted Codex eval succeeds in 44.6 seconds with seven logical MCP calls,
a high-confidence neutral answer and no harness warnings. Its trace confirms
both original misses and successful corrected requests; no quality grade is
claimed. Coordinator re-review remains outstanding.

## Coordinator review round 2

All three accepted findings are verified and fixed:

1. A repository-snapshot miss with availablePackageVersions: [] now follows the
   same passthrough/no-action path as an absent registry inventory. The original
   probe covers both shapes and still checks nonempty registry alternatives.
2. Deps, vulns and code-diff parity tests set real CLI argv in try/finally,
   assert both native actions, and compare the remaining complete error facts.
3. Generic CodeNavigationErrorMetadata no longer carries recovery. The two
   version/ref cases decode it directly from extensions into their typed errors.

Round 2 verification: 199 focused tests and all 5,886 unit tests pass, along with
both package builds, typecheck, changed-file lint, public-package validation and
source CLI/MCP smokes using file-storage auth handling. The isolated live smoke
cohorts explicitly skip for AUTH_REQUIRED. No work is deferred; coordinator
re-review remains outstanding.

The round 2 targeted Codex eval succeeded in 32.8 seconds with seven logical MCP
calls, a high-confidence neutral answer and no harness warnings. Inspected calls
and the final answer confirm original errors, native corrections and successful
corrected requests. No quality grade is claimed.
