---
"githits": minor
"@githits/mcp": minor
---

- **Registry repository provenance** - Package info adds the metadata-supplying registry repository name and URL; info, dependency and vulnerability JSON retain `registryRepository: {id,name,url}` when proven. Requires backend 83ea8448a provenance fields in production before release or hosted MCP adoption; unknown evidence is omitted and existing inspection behavior is preserved.
