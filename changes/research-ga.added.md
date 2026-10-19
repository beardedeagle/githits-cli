---
"githits": minor
"@githits/mcp": minor
---

- **Stable research** - Enable `githits research` and the MCP `research` tool by default in the CLI, local MCP and public `@githits/mcp` inventory, with routing guidance in `quick_start` and the `githits-mcp` skill; `[experimental] tools = true` is no longer needed. Research rate-limit errors now distinguish a short-term limit (retry after the given seconds) from the daily limit, which resets at 00:00 UTC. MCP providers must now supply `agenticAskService` (`AgenticAskServiceImpl` from `@githits/mcp/client`); hosted availability follows released-package adoption and deployment.
