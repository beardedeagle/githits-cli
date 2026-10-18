---
"githits": patch
"@githits/mcp": patch
---

- **Expose unknown vulnerability assessments** - Direct CLI and MCP vulnerability reports show the unknown count and assessment status, accept unknown advisory scope with human-readable reasons, and preserve unknown backend values in JSON. Upgrade reviews retain direct unknown counts and generic unknown-detail messages. Unknown scope with transitive mode is rejected until the backend exposes complete transitive counts and rows.
