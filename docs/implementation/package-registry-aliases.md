# Package registry input aliases

`cargo:` selects the same public crates.io package as `crates:` in CLI and MCP
package targets. Structured registry inputs also accept `cargo`. Registry spelling
is case-insensitive and trims surrounding whitespace, including the prefix segment
in compact addresses. Package names, versions, ranges and existing restrictions
(such as latest-only `pkg_info` and unversioned diff targets) remain unchanged.
This adds no alternate Cargo registry or PURL input syntax.

## Ownership and canonical identity

The pure `parsePkgseerRegistryArg` in private core registry code owns input
spelling. Both core entrypoints export it; canonical unions, type guards, registry
lists and GraphQL enums still contain `crates` / `CRATES`, never `cargo` / `CARGO`.
MCP package-spec owns compact address grammar. Shared summary, dependency,
vulnerability, upgrade-review, package-doc listing and resolver-filter builders
normalize registry spelling before enum conversion or capability checks. Resolver
filters deduplicate after normalization. Unknown prefixes do not fall back to npm.

Navigation, search, changelog and diff inherit compact normalization. Presentation
recognizes retained Cargo labels as packages and constructs canonical package
actions through package-spec. The deprecated code-files command uses shared prefix
admission for its conflicting `--repo-url` positional check, even for malformed
package-looking input.

Unified read/list/grep intentionally preserve target bytes for backend parsing;
raw request/replay/attribution labels may retain `cargo:`. Do not duplicate address
grammar in those request builders or rewrite evidence labels merely for spelling.

## Delivery and rollout

Backend PR #3424 merged as `1eb8b98768c362668cac0bccaeca513dd388b012` before this
client increment (user handoff evidence). Merge is not deployment evidence.
Publication requires an alias-capable backend and authenticated paired Rust
metadata/search and forwarded list/read/grep checks. Permanent smoke alias cases
exercise client-normalized metadata; forwarded alias checks are separate live
verification until backend availability is established.

Hosted MCP receives this behavior only after the public MCP package is released,
the hosted repository adopts it, and that server is deployed. Those are separate
approval gates. Revert the client/package adoption for rollback; roll back clients
that forward aliases before removing backend alias admission. Public Agent Skill
alias notes follow the release lifecycle; this increment leaves their canonical
examples and stable quick_start unchanged.

## Verification (2026-10-19)

Focused Bun verification passed 1,069 tests across 36 files (3,492 expectations):
registry/spec/builders, compact navigation/search/changelog/diff, raw forwarding,
presentation, CLI conflict errors, metadata parity and related regression cases.
`bun run typecheck` and `bun run validate:packages` passed; the latter runs both
root and MCP builds and validates packed consumers outside root path aliases.

Source `smoke:cli` and `smoke:mcp` passed (43 and 10 steps); live cohorts
skipped with `AUTH_REQUIRED`. Built Node CLI and MCP smoke modes also passed
(auth handling and registration). These do not prove authenticated alias parity.

The required local Codex package-overview-vulnerabilities workload completed in
32.7 seconds in neutral descriptor discovery. Inspection found an empty
`tool-calls.json`, a success/high-confidence final answer and no isolation-violation
artifact. Metrics recorded 51,347 uncached input, 105,216 cached input and 1,661
output tokens; the cost estimate was $0.00701736. No GitHits call occurred, so this
run provides neither changed-path/alias evidence nor a graded quality claim.

A dev source `list cargo:serde --limit 1 --json` probe with explicit file storage
returned `AUTH_REQUIRED`. A prior default-storage probe returned no output and
was stopped. No auth material was read or copied. Authenticated paired dev Rust
metadata/search and forwarded list/read/grep, and actual backend alias deployment,
remain unverified publication gates. Draft PR preparation is independent of them.
