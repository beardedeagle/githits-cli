# Version and ref error recovery

Status: implemented and verified; coordinator review pending (per task brief).

## Outcome and scope

VERSION_NOT_FOUND and REF_NOT_FOUND preserve typed backend recovery facts in
CLI/MCP JSON, and render one concise identity/suggestion block plus a native
next step in text. Cover package intelligence and code navigation consumers;
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

JSON keeps backend prose and complete structured recovery lists. Text rewrites
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

- 5,875 unit tests passed; focused recovery, service propagation and actual-tool
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
  docs/implementation/version-ref-error-recovery-evidence.md.
- Codex targeted descriptor-only eval succeeded with 10 logical MCP calls,
  79.4 seconds, high-confidence neutral final answer and zero validation
  violations. Claude could not start tool use because its isolated session was
  not logged in. No quality grade is claimed.
- A pre-existing packaged guide mismatch caused two baseline unit failures.
  Main independently fixed it in 004c82f. Merged main without rewriting history;
  the final PR has no separate guide delta or duplicate repair fragment.
- Nullable version associations belong to recovery records; success-result
  types stay unchanged. JSON contains facts; native action prose is text-only.
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
