---
"githits": minor
"@githits/mcp": none
---

- **Removed `githits ask`** - Breaking: the `ask` alias of `githits research` is gone and `githits ask` now fails as an unknown command. Scripts and agent instructions that call `githits ask` must switch to `githits research`, which takes the same arguments and options.
