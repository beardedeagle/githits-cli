# Secret scanning

## Purpose

Keep credentials out of this public repository and out of the published npm
packages. Git history is already public, so a secret that lands in a commit
should be treated as exposed.

## Scanner

CI and the pre-commit hook use the gitleaks OSS CLI, version 8.30.1, installed
from the GitHub release archive. They do not use `gitleaks/gitleaks-action`.
That action needs a commercial license for organization repositories.

Pull requests and pushes to `main` scan the commits that event introduced.
A weekly schedule, and a manual run of `.github/workflows/gitleaks.yml`, scan
the full history. The workflow uploads a redacted JSON report and writes a
step summary that omits matched values.

Do not fingerprint a real secret that still needs rotation. A full-history scan
stays failing while any unresolved historical finding remains. An owner-accepted
test-only key is a separate `.gitleaksignore` group that names who accepted it.
The pre-commit hook and the pull-request job only scan newly introduced changes.

## Local scan

Install gitleaks 8.30.1 and put it on `PATH`. The Husky pre-commit hook runs
`bun run check:gitleaks`, which scans staged changes and requires that exact
version.

Scan the full history from the repository root:

```sh
gitleaks git --redact --no-banner --no-color .
```

`.gitleaks.toml` extends the default rules. Suppression order when a finding
is not a real secret:

1. Fix the value.
2. Add an inline `gitleaks:allow` comment on the finding line.
3. Add that finding's fingerprint to `.gitleaksignore`.
4. Narrow a rule in `.gitleaks.toml`.

Do not add a broad path allowlist.

## Published packages

Both public packages use an npm `files` whitelist. A root `.env`, local config,
or the proxy smoke script is not in that list, so those root files are not
packed. `@githits/mcp` publishes `dist`, `README.md`, and `LICENSE`. The root
`githits` package also publishes directory trees (`dist`, `skills`, and the
plugin directories). npm does not exclude `.env`, `.env.*`, private keys, or
local config files that sit inside those directories. A secret-bearing file
committed under one of those trees would be published. None are in the current
trees.
