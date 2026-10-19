---
"githits": minor
"@githits/mcp": minor
---

- **Registry repository provenance** - Package info adds the metadata-supplying registry repository name and URL; info, dependency and vulnerability JSON retain `registryRepository: {id,name,url}` when proven. Release and hosted adoption require the `packageInfo.selectedVersion.registryRepository` schema in production; unknown evidence is omitted and existing inspection behavior is preserved.
