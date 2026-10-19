---
"githits": patch
"@githits/mcp": patch
---

- **Cancelled MCP tool calls abort their backend requests** - When an MCP host
  cancels a tool call or the client disconnects, `list`, `read`, `grep`,
  `resolve_target`, `code_diff`, `pkg_info`, `pkg_vulns`, `pkg_deps`,
  `pkg_changelog`, and `pkg_upgrade_review` now abort their in-flight GitHits
  requests instead of letting them run to completion, matching `get_example`,
  `search`, `search_status`, and `research`. Cancelled calls are not retried
  after a credential refresh. Service interfaces accept an optional trailing
  `{ signal }` argument; existing callers and custom services are unaffected.
