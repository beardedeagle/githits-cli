---
"githits": patch
"@githits/mcp": patch
---

- **Progress never delays a call** - `RelayReceiver` now chooses its relay ID locally and connects in the background, so tool calls and CLI commands start immediately instead of waiting up to a few seconds for the progress connection. Updates published before the connection is ready are skipped. The `connectWaitMs` and `firstConnectWaitMs` options are deprecated and ignored.
