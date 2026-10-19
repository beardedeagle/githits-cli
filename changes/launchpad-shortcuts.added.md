---
"githits": minor
"@githits/mcp": minor
---

- **Launchpad Git shortcuts** - Accept project, distribution-source and owner-scoped Git defaults through `lp:`, `launchpad:` and supported HTTPS URLs, superseding the qualified-only shortcut restriction. The backend resolves current owners; follow-up actions retain canonical identities and refs. Remove the obsolete unsupported-shortcut error and shorten invalid Launchpad target guidance. Unequal raw diffs still report `RAW_DIFF_UNAVAILABLE`.
