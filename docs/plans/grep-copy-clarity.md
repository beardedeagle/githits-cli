# Explicit grep status and recovery copy

Status: IMPLEMENTING, user-requested revision of PR #496.

The user found the first copy pass insufficiently explicit, helpful and
actionable. Rendered fixtures confirm that `coverage is incomplete` describes
uncertainty without saying what happened, and `targets marked retryable` makes
callers infer the eligible operands and controls. Native failure rows also join
status, code, retryability and backend reason into repetitive prose.

## Scope and ownership

One copy-only revision in the existing shared grep formatter. Callers own the
original request operands; the formatter owns how to present results/recovery.
Pass original ordered operand names through existing formatter options from the
two callers. Resolve retry attribution using authoritative input indices;
never construct operands from abbreviated provenance or resolved source labels.
Keep backend/API/JSON, matching, exit behavior, public descriptors, successful
hit/read rendering and cursor traversal unchanged. No infrastructure or new module.

Verified assumptions: unavailable inputIndex and native requestedInputIndices
provide original-request attribution. Callers already hold normalized params.
The formatter is also called directly without request context in tests; that
mode can identify affected sources but must not present those labels as original
operands. Preparation waits are first-page budgets, not completion ETAs.
Terminal omissions have no unchanged retry; backend-supplied site suggestions
can be presented as alternatives. Unknown backend reasons remain unchanged.
Unknowns/product decisions: none. Dependencies: existing coverage predicates,
request params, provenance and wait helpers. No new API selection or secret use.

## Expected behavior and acceptance

- Replace abstract coverage language with explicit unsearched-content wording;
  keep complete-empty negatives, pending preparation and empty-page distinctions.
- Recovery names eligible original targets, preserves the pattern/options,
  names the exact CLI/MCP cursor control to omit, and explains the bounded
  preparation wait. Do not infer preparation from generic retryability.
- Use source-only attribution when original operands are not supplied. Repeated
  original names must remain distinguishable when only one input is retryable.
- Keep terminal explanations and suggested alternatives compact and concrete.
  Put native backend messages/codes in a separate reason line instead of joining
  a completed sentence to semicolon-separated flags.
- Preserve expiry's sole full-query restart, independent continuation and
  explained/unexplained coverage distinctions covered by the prior review.

Focused verification: same seven grep formatter/response/preparation/tool/CLI
and parity files as PR #496, with direct checks for request-context attribution,
duplicate names, CLI/MCP controls, reason/code punctuation and unchanged JSON.
Render the pending, terminal, native failure, mixed zero-hit and partial-hit
fixtures before/after; measure text bytes, not inferred token savings. Existing
mixed-100/repository-100 successful fixtures must remain byte-identical.
Run build, typecheck, changed-file checks and required development CLI/MCP smoke.
The prior normal-path agent eval remains applicable (no descriptor/matching
change); fixtures prove the revised error copy. Review full revised PR delta
with internal preflight and the retained Claude reviewer, then commit/push/update
the existing draft PR. No merge/release/deploy.

Plan review is skipped: this codifies wording and recovery clarity within the
same user-approved scope/ownership/acceptance goals, with no new architecture or
phase boundary. Keep this plan through code review; once clean, transfer durable
copy contracts to implementation docs and remove this plan in a final commit.

## Evidence before external review

111 focused tests pass (961 assertions); build/typecheck and ten-file Biome
checks pass. Internal preflight reviewed the full revised PR and this revision:
direction sound, no findings. New tests verify original-target attribution,
duplicate-name positions, unsafe shell/MCP quoting and source-only direct mode.
Healthy mixed-100/repository-100 outputs remain byte-identical at 6967/5754 bytes.
Rendered request-aware examples: pending248B, terminal191B, native434B,
mixed472B, partial hits611B. These are larger than the previous vague copy;
the added text names affected inputs, exact controls and the bounded wait.
This is not a claim of runtime performance or measured token savings.
Required development smoke and targeted normal-path agent eval are running.
No backend failure states were fabricated as live repros; fixtures supply them.
