---
"githits": patch
"@githits/mcp": patch
---

- **No refresh attempt for project API keys** - Authentication failures with a `gh-proj-` project API key no longer trigger a credential refresh, matching personal `ghi-` API tokens; only signed-in sessions refresh.
