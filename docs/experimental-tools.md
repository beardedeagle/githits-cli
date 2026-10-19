# Experimental Tools

GitHits currently has no experimental tools. Every CLI command and MCP tool is
part of the stable surface and needs no opt-in:

| Former experimental tool | Status |
|---|---|
| `research` / `githits research` | Stable; see [research](implementation/research.md) |
| `resolve_target` / `githits resolve` | Stable; see [target resolution](implementation/resolve-target.md) |
| `code_diff` / `githits code diff` | Stable; see [source diff](implementation/code-diff.md) |

## Existing configuration

An existing GitHits `config.toml` with

```toml
[experimental]
tools = true
```

keeps working: the CLI ignores the section, and the local stdio MCP server
reads it but registers exactly the stable inventory and guide. You can remove
the section; nothing changes either way. A malformed `[experimental]` value is
still reported by `githits mcp start`, which parses the setting strictly.

## The experimental seam

The mechanism remains for future local dogfooding:

- `LOCAL_EXPERIMENTAL_TOOL_DEFINITIONS` in
  `packages/mcp/src/mcp/local-server.ts` lists local-only MCP tools; it is
  empty. Each definition supplies its factory and one quick-start bullet, which
  `buildLocalMcpQuickStart()` appends under `## Local experimental tools` with
  the privacy sentence. With no definitions the local guide equals the public
  `buildMcpQuickStart()` byte for byte.
- `[experimental] tools = true` or the hidden
  `githits mcp start --experimental-tools` flag (evaluation infrastructure,
  process-local) enables those definitions.
- The agent-eval `experimental` suite and safety class select experimental
  workloads; the suite is empty and reports so when selected.

The CLI no longer gates commands: the command-level experimental policy was
removed with Research promotion because it had no remaining commands. A future
experimental CLI command reintroduces a gate alongside its MCP definition.
Experimental tools never weaken the privacy or output-safety requirements
applied to stable tools.
