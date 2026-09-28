---
"githits": minor
"@githits/mcp": minor
---

- **Remove the `PKGSEER_URL` alias** - `PKGSEER_URL` no longer configures the OSS backend or passes through eval launches; move custom OSS endpoint values to the existing `GITHITS_CODE_NAV_URL`. This applies to the CLI, local MCP, and consumers of `@githits/mcp/client` URL getters; it does not change hosted MCP configuration.
