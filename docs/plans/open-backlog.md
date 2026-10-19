# Open backlog

## Validation error recovery after PkgSeer phases 3-4

Deferred from the completed version/ref recovery work in PR #485. Start after
PkgSeer public-error-catalog phases 3-4 ship and their actual validation shapes
are verified. The current client behavior is documented in
[version and ref error recovery](../implementation/version-ref-error-recovery.md).

Outcome: consume structured `VALIDATION_ERROR` facts, including `input_path` and
`reason`, and give CLI users and MCP callers recovery guidance in their own flag
or argument names. Preserve complete decoded facts in JSON and pass backend
prose through for unknown reasons or incomplete shapes; do not scrape messages.

Ownership: core services decode the backend contract; shared presentation and
CLI/MCP boundaries own user wording and native syntax.

Acceptance: verify the shipped producer contract and real responses, then add
parser, formatter and actual-surface tests for known reasons, malformed/missing
fields, unknown reasons, CLI/MCP JSON preservation and native guidance. Run the
affected CLI/MCP smoke suites and targeted agent evals. Grep `target_issues` and
indexing recovery remain separate contracts.

## Optimize overall tool routing and investigation instructions

User deferred this follow-up until after unified MCP grep adoption on
2026-10-01. Scope is overall search/grep/read strategy, not an unfinished
unified-grep implementation.

Evidence: [PR #439 Braintrust run](https://github.com/githits-com/githits-cli/actions/runs/36717422684)
had seven successful grep calls with reusable read locators. Source investigation
still made avoidable reads before locating usages, and mixed-docs runs added
site scopes despite package-selected hosted docs already being included. Adding
an explicit site extends coverage; it does not narrow existing package docs.
The durable comparison is in
[agentic-eval-metrics.md](../implementation/agentic-eval-metrics.md#unified-mcp-grep-versus-release-0240--2026-09-30).

Outcome: make the normal investigation route accurate and efficient. Verify
whether search or grep gives better evidence for identifier usages before
prescribing either universally; the attempted paired Express CLI comparison
produced no results because both processes timed out on the local auth storage
lock. Do not treat that as tool performance or result-quality evidence.

Ownership: tool descriptions own selection and scope semantics; the shared
routing guide owns cross-tool strategy. Keep its public MCP skill copy aligned.

Acceptance: compare the same pinned Express identifier task through search and
grep, inspect the actual usage evidence and output size, then evaluate the
source-grep and mixed-docs workloads under intent and full guidance against the
recorded four-cell baseline. Preserve exact locators, truthful coverage and
version attribution, and avoid an unnecessary prerequisite search/read step.
Single-run token changes and self-reported confidence are not quality scores.

## Upgrade review evidence completeness

The new aggregate `changelog.statements` contract exposes per-version coverage
membership and complete pages beyond the legacy risk-item cap. Client adoption
is documented in [upgrade review](../implementation/pkg-upgrade-review.md).

Structured supersession/revert relationships remain unavailable. That requires
backend API design, not client heuristics, and stays outside this migration.
Preserve the concrete requirements in the
[upgrade review limitations](../implementation/pkg-upgrade-review.md#other-evidence-and-fact-reporting-rules).
Consumer applicability remains the calling agent's job.

Concrete remaining case: Express 5.2.0 describes a security fix for
CVE-2024-51999; 5.2.1 says the prior change was erroneous, reverted, and the CVE
rejected. Separate versioned quotes are available, but no field links the earlier
claim to its correction. A reader must reconcile them manually; tier counts do
not describe the effective state at the target version.

Outcome: backend-provided supersession/revert relationships that retain the
original statements and cite the correcting statement's version/source evidence.
Acceptance: fixtures for that Express range expose the relationship with locators
and provenance; clients can display it without keyword-based guessing or a
package verdict. This needs backend/domain design and remains outside the
completed statement migration. Private-code applicability still requires local
usage inspection and before/after checks by the caller.


## Cargo alias rollout and hosted adoption — 2026-10-19

Client implementation accepts `cargo:` / `cargo` as crates.io aliases while
canonical identity stays `crates` / `CRATES`. See
[registry input aliases](../implementation/package-registry-aliases.md).
Backend PR #3424 merged as `1eb8b98768c362668cac0bccaeca513dd388b012` (user handoff);
that does not establish deployment. A dev source probe using explicit file auth
storage returned `AUTH_REQUIRED`; authenticated backend alias availability has not
been established from this worktree. Publication requires paired Rust metadata,
search and byte-forwarded list/read/grep verification against the alias build.
This deployment/access gate does not block preparation of the client draft PR.

After separately authorized publication and a full handoff, reorient the hosted
repository on current main, released artifact version and consumer lockfile. Use
its existing MCP dependency-bump workflow; update manifest/lockfile without
copying package-owned alias logic. Acceptance: intended published artifact resolves,
consumer checks pass and, after separate deployment approval, authenticated hosted
paired metadata/search and forwarded list/read/grep verify alias parity. Revert the
dependency for rollback; roll back forwarding clients before removing backend
admission. Exact artifact/deployed state is unknown until that increment. No
merge, release, publication, deployment or other repository edit is authorized by
this client handoff.

At release, add the short alias note to public package/code skill guidance if
useful; keep canonical examples and follow the public Agent Skill lifecycle.
