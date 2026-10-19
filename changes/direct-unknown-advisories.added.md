---
"githits": minor
"@githits/mcp": minor
---

- **Expose unknown vulnerability assessments** - Direct CLI and MCP vulnerability reports show unknown counts, accept unknown advisory scope with readable reasons, explain uncertainty in text and retain assessment status in JSON. Transitive all-scope reports label returned unknown occurrences separately. Upgrade reviews retain direct unknown counts and generic unknown-detail messages. Unknown scope with transitive mode is rejected until the backend exposes complete counts and rows.
