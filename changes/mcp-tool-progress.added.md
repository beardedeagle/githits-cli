---
"githits": minor
"@githits/mcp": minor
---

- **Live progress for `research` and `get_example`** - When an MCP host requests progress, the local MCP server now forwards GitHits status updates as `notifications/progress` while these long-running tools work; hosts that display them (such as Claude Code) show the current stage under the running call. Progress is best effort and authorized by the caller's own token: if it is unavailable, calls run exactly as before and the final result is unchanged. `@githits/mcp` adds an optional `progress` server option and a credential-free `RelayReceiver`, and now depends on `ws`.
