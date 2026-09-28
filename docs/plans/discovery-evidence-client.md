# Plan: Discovery v31 evidence client

## Status

One increment, in progress. Keep this plan through PR review; transfer current
behavior to `docs/implementation/` and delete the plan after merge.

## Outcome and verified state

Search and search status, for CLI and MCP text and JSON, request only the v31
evidence needed to present repository hits. Path-only hits remain navigation
candidates; numbered source is shown only from `matchedSource`; crawled pages
use `documentationPreview`. The user approved removing legacy hit fields from
JSON as well as text. PkgSeer remains compatible with older installed clients
and is outside this worktree's edit scope.

The shared service query currently selects legacy `summary`, summary highlights,
hit `contentSafety`, and JSON `focusedSource`. PkgSeer's GraphQL resolver maps
any of those selections to legacy or compatibility presentation branches, which
can hydrate repository content from CAS. The producer's matched-only presentation
test shows one requested range for an authoritative hit and no CAS request for
a path-only or unfocused hit. Crawled pages have a separate CAS-free preview.

## Boundary and scope

`CodeNavigationServiceImpl` owns the GraphQL selection and decoding. The shared
search response builder owns JSON projection; the shared formatter owns text;
CLI and MCP entrypoints only pass request parameters and cancellation. The
smaller placement is to remove retired selections in the existing shared query
and retired fields in the existing shared projection. There is no new module,
mode, fallback, or backend change.

Non-repository `DOCUMENTATION_PAGE` hits use `documentationPreview` for content.
`REPOSITORY_SYMBOL` is repository navigation and loses its old summary body,
while retaining title, identity, and follow-up locator. This is the user's
approved JSON compatibility change. The service may tolerate old injected input
shapes, but its queries and public response builder do not emit them.

## Assumptions and decisions

- Verified: the production-schema-compatible v31 fields exist on the development
  backend and the shared queries serve both initial and stored results.
- Verified: the producer's selection-to-presentation mapping triggers legacy
  hydration for any retired field and matched-source hydration only for
  authoritative source.
- Decision: both public packages receive pending minor impact because JSON
  consumers lose fields.
- Unknown product decisions: none.

## Acceptance

- Both wire queries omit legacy selections and the focused-source variable.
- CLI/MCP text and JSON omit all retired hit fields on initial and stored paths.
- Path-only hits show a candidate file/read locator without source lines;
  proven source shows only the numbered matched range and semantic context;
  crawled pages show preview text and grapheme highlights.
- Focused service, CLI, MCP, parity, build, smoke, and package checks pass.
- A development backend query validates the actual request against the current
  v31 schema; producer source and tests establish CAS selection behavior.
- Documentation and release fragment match the implemented contract; one PR
  against main is reviewed and CI checked. No merge, publish, or deploy.

## Completion record

Update this section with the exact verification, review, and PR evidence before
opening the PR.
