# Final increment: complete transitive unknown evidence

Status: implementation and local/live verification complete; coordinator review
pending. PR #486's direct increment is merged. This increment starts from fresh
origin/main on jlitola/cli-transitive-unknown. Coordinator owns external review.

## Verified contract and ownership

PkgSeer #3392 supersedes the direct-only restriction. Verified backend
origin/main schema: unknown summary counts, unknownCount per package,
unknown-only package rows and combined = affected + non-affecting + unknown.
Core parses authoritative counts and scoped occurrences; the existing shared
vulnerability formatter owns CLI/MCP JSON and text. No derived complete unknown
counts, new infrastructure, service composition or auth changes.

Direct contracts and upgrade uncertainty behavior are durable in
package-vulnerability-assessments.md and pkg-upgrade-review.md. PR #486 retains
its historical measurements. The completed backend dependency is removed from
the backlog; public skill examples remain release-bound.

## Scope and assumptions

- Accept UNKNOWN at both request/service boundaries, including the transitive
  fetch. Direct pagination, exact root identity and proof validation stay intact.
- Select each of four totals once using existing selected-count aliases.
  Select status for UNKNOWN/ALL, reasons for UNKNOWN/ALL or detail output, and advisory-wide details only for
  verbose/JSON. Missing new fields remain absent; future enum strings survive.
- Keep occurrenceCount/packageCount scoped. Add complete count partitions to
  audit summary and package JSON. Zero counts remain numeric, matching direct
  reports; zero-unknown text remains unchanged. Human reasons and native hints
  surface uncertainty without repeating confirmed-affected evidence.
- Live values can change; compare captures, not assumed example numbers. Prod
  verification is explicitly requested. Use normal CLI/MCP authentication;
  never inspect/export/print credentials. No backend edits or deployment.

## Verification and review packet

- Baseline built from fresh main. Real CLI/MCP captures cover torchvision
  0.20.1 and express 4.21.2, affected and unknown scopes, text and JSON.
  Baseline default torchvision: CLI text 4176, MCP text 1103, JSON 17141/17140
  characters; after JSON 17369/17368. Express text stays 1652/1498 and JSON
  changes 3852/3851 -> 4142/4141. Both text surfaces are byte-for-byte unchanged.
  Unknown scope changes from rejection to successful empty output: torchvision
  CLI/MCP text 204/203 and JSON 614/613; express 199/198 and 606/605.
  Prod differs from the brief: torchvision is now 21+116+0=137, torch 21+10+0=31,
  express 6+29+0=35. TensorFlow graph unknown is also zero. Live nonzero coverage
  could not be demonstrated with these current samples; deterministic fixtures
  validate reasons and unknown-only packages. Captures live outside the repository in
  /tmp/githits-transitive-unknown; final before/after table belongs in the PR.
- Unit coverage includes missing/extra fields, future strings, minimal wire
  selections, unknown-only rows, human reasons, native hints, zero-unknown
  text and real CLI/MCP JSON parity. Final focused run: 495 pass, zero fail.
  Full local bun test: 5947 pass, zero fail before four final narrow display and
  JSON-losslessness regressions. Final focused tests cover all four: package
  unknown available without summary unknown, empty ALL wording unchanged, and
  fetching/preserving nonempty affected reasons. Two such reason arrays are
  present on current torchvision's torch occurrences and retained in JSON. Final full CI results belong in
  the PR. Typecheck/Biome/build and public-package validation pass.
- Required source CLI/MCP smoke passes with GITHITS_AUTH_STORAGE=file; live
  cohorts explicitly skip. Default source MCP smoke fails its auth probe because
  the system keychain is unavailable under the smoke suite's isolated HOME.
  Reproduced on Bun and Node; normal-home authenticated CLI/MCP calls succeed.
  Do not alter auth behavior or handle credentials to work around this limitation.
  Both secret-free built CLI/MCP smoke suites pass; results are recorded in the PR. No deadlines changed for host load.
- Authenticated live counts and lossless parity pass, excluding only per-request
  calculation timestamps. Targeted descriptor eval completed three actual MCP
  calls in 46.7 s (quick_start, pkg_vulns ALL, pkg_vulns UNKNOWN), giving the
  current dependency 21/116/0/137 counts and empty unknown scope with high
  confidence. Tool-calls/final/metrics inspected; no isolation artifact emitted.
  Observed behavior only, no quality grade. Run 2026-10-19T06-45-39-145Z.
- Add an independent minor fragment for both artifacts. Push and open a draft
  PR to the default branch. Never merge/release/tag/publish.

After coordinator review is clean, transfer any remaining durable facts and
DELETE THIS PLAN AS THE LAST COMMIT IN THIS PR. Keep it through review. The
untracked .brief-transitive-unknown.md is input only and must not be committed.
