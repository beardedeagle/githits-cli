# Grep causes and recoverability

Status: implementing a wording clarification of PR496 after user feedback:
"But why couldn't it be searched. Is it permanent or transient".

Outcome: affected targets state their available cause and whether an unchanged
retry is supported, without treating retryability as proof of eventual success
or non-retryability as permanent unavailability. Existing native readiness,
publicMessage/errorCode and omission reason own cause; backend retryable owns
retry advice. The existing shared formatter owns this presentation. No new
module, API/query, schema, matching, JSON, polling or retry behavior.

Verified: omission rows currently show a reason but no explicit recoverability;
native rows show readiness and supplied message/code but leave retryability to
the footer. Both message/code may be null on the typed/validated failure shape.
Overall traversal has no cause/retryability field; missing global failure
information cannot be invented. Source skips and normal cursor pagination must
not be mislabeled as temporary failures. Unknown reasons stay unchanged.

One phase, same approved scope and ownership. Add plain per-item retry advice
using existing coverage checks; pending preparation remains explicitly in
progress. Show when a failed scope provides no further details. Explain missing
cause/retryability for otherwise unattributed overall limitations, including
zero-hit results; preserve attribution predicates and supported cursor actions.
Keep retry footer target selection/waits and expiry precedence intact.

Assumptions: retryable means a retry is supported, not guaranteed to succeed;
false means no unchanged retry recommendation, not permanent unavailability.
Unknown/product decisions: none. Dependencies: existing formatter, authoritative
result fields, coverage helpers, retained reviewer. No new infrastructure.

Acceptance: plain cause+retry advice beside retryable/terminal native and omitted
targets; missing-cause cases explicit; mixed target advice remains independent;
preparation/continuation remain distinct; complete negatives and usable hits
unchanged; no unsupported promise of temporary/permanent classification.

Verification: seven existing focused grep test files, with new assertions for
both retry flags, missing native detail and unattributed zero-hit traversal;
build/typecheck/Biome; existing mixed100/repository100 size cases before/after
and rendered failure examples. Run source CLI unauthenticated smoke and MCP
registration smoke on final text; prior authenticated development smoke/eval
prove unchanged caller/matching paths, fixtures prove failure states. Review
with internal pre-flight and retained external reviewer, then commit/push/update
existing draft PR and check CI. No merge/release/publish/deploy. Delete this
plan after clean review, keeping contracts in implementation docs.

Plan review skipped: this clarifies wording/accuracy within the same approved
scope, architecture, phase and acceptance goals. No direction or boundary change.

## Pre-review evidence

122 focused tests pass, 1019 assertions; build/typecheck pass. CLI source
unauthenticated smoke passes33steps; MCP source registration smoke passes7steps,
including auth handling. The dev MCP agent run is pending. Existing healthy
mixed100/repository100 outputs remain byte-identical at6967/5754bytes via cmp.
Rendered current cases: pending248B,terminal215B,native449B,partly-pending337B,
mixed496B,partial hits626B. Added text states retry advice and missing causes;
no token/runtime savings claim. Unknown overall limitation is now disclosed on
zero-hit pages too, with supplied cursors usable. No production reproduction
of failure states or unsupported permanence guarantee.

Internal pre-flight of the latest clarification and full PR is clean: direction
sound, no findings. Native/omitted advice uses backend retryability, ordinary
pagination has no failure note, expiry retains its sole restart, unknown overall
limits preserve supplied continuation. Failure combinations remain fixture-tested.
