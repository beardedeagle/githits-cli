# Version and ref error recovery

Core services decode `VERSION_NOT_FOUND` and `REF_NOT_FOUND` using
`parseVersionRefRecovery()`. Package intelligence, code navigation, list, grep,
and target resolution preserve the same public facts. Registry publication
history (`available_package_versions`, strings) stays separate from indexed
snapshots (`available_versions`, ref/version records). Ref inventories preserve
nullable version associations, ordering, empty arrays, input paths and target
indices/counts. Unknown codes and malformed optional fields do not prevent
showing the backend message.

CLI `--json` and MCP `format: "json"` retain backend prose and complete decoded
recovery lists in the shared error envelope. They do not scrape suggestions out
of prose or truncate lists for presentation. Registry releases appear as
`details.availablePackageVersions`, indexed snapshots as `availableVersions`,
and ref corrections as `suggestedRefs`; `availableRefs`, `latestVersion`,
`latestIndexed`, requested identity and input context remain separate facts.
Unknown future extension fields are ignored, as before.

`formatMappedErrorText()` owns human wording for both surfaces. When the
identity and suggestions are present, it replaces backend prose with a concise
package/version or repository/ref sentence. A version miss does not claim the
registry lacks a published release: the same code also covers source-snapshot
resolution failures. Code-diff ambiguity retains its original explanation and
never selects an arbitrary ref. It shows at most five alternatives
plus the omitted count, once, taking producer ordering as authoritative. The
first candidate supplies the recovery action. With one suggestion and an
action, the value appears only in the action. Incomplete recovery shapes retain
backend prose; no guessed version or ref is introduced. Code-diff keeps its
side, stage, limit, ref kinds and compared commits when supplied.

CLI actions reuse the original invocation and replace the failed target or
native version/ref operand, preserving paths, filters and output flags. Shell
operands are quoted. MCP boundaries supply the actual tool and arguments;
actions name the argument or array member to change. Actions are text only;
JSON remains a surface-neutral facts envelope. Actions cannot be constructed
when the original invocation has no matching operand.

`pkg info` remains latest-only. `resolve` still rejects canonical targets
locally. These tools preserve unexpected structured errors without inventing
new version parameters. Grep `target_issues`, validation, indexing and auth
recovery follow their existing contracts.

The four live evidence cases are npm Express `99.0.0` through deps, Go Docker
`v20.10.0` through deps, and Express `v99.99.99-nope` through read and list.
The npm deps producer currently supplies no alternatives, so its neutral message
passes through. Go supplies `v20.10.0+incompatible`; ref corrections prefer
`suggested_refs` over the separate indexed `available_refs` inventory. Tests
cover service decoding, real tool boundaries, shared output, CLI operands,
malformed fields, forward compatibility and complete CLI/MCP JSON facts. Both
live smoke suites include Go version and repository ref recovery probes.
