---
"githits": minor
"@githits/mcp": minor
---

- **Package-path advisories** - Unified grep preserves backend path warnings in CLI/MCP JSON and displays unverified, safely quoted target/path alternatives beside matches and pending results. Requires a backend deployment exposing `GrepResult.pathWarnings` before client release; injected grep providers must return the required warning array.
