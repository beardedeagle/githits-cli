---
"githits": minor
"@githits/mcp": minor
---

- **Live progress in `githits research` and `githits example`, with an animated mark** - Both commands now show the real GitHits stage instead of rotating placeholder labels, next to a braille "narrowing" mark that converges on its target as the work progresses. The local MCP server animates the same mark in its progress messages for hosts that display them (such as Claude Code); `@githits/mcp` hosts can tune or disable this with the new `progressAnimation` option. Frames are generated locally, so no extra network traffic is involved.
