---
"githits": minor
"@githits/mcp": minor
---

- **Select backend defaults with `GITHITS_ENV`** - `GITHITS_ENV=dev` selects development service defaults across the CLI and local MCP, while unset or `prod` retains production defaults and existing URL overrides remain independent. The production OSS default is now `https://oss.githits.dev`; the CLI-only development accounts URL is `https://zcwquvryvmjuwckxdevg.supabase.co`. Consumers using `@githits/mcp/client` URL getters receive the selected defaults; this does not reconfigure hosted MCP.
