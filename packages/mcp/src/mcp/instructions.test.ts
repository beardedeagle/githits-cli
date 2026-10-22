import { describe, expect, it } from "bun:test";
import { RESEARCH_VERIFIED_ANSWER_GUIDANCE } from "../shared/research-guidance.js";
import {
  buildLocalMcpInstructions,
  buildLocalMcpQuickStart,
  buildMcpInstructions,
  buildMcpQuickStart,
  type LocalExperimentalToolGuidance,
} from "./instructions.js";

const PROBE_TOOL: LocalExperimentalToolGuidance = {
  name: "probe",
  guidance: "- `probe` — probe one experimental contract.",
};
const EXPERIMENTAL_TOOLS = [PROBE_TOOL] as const;

function buildLocal(
  enabledExperimentalTools: readonly LocalExperimentalToolGuidance[],
): string {
  return buildLocalMcpQuickStart({
    enabledExperimentalTools,
  });
}

function normalized(text: string): string {
  return text.replace(/\s+/g, " ");
}

describe("buildMcpQuickStart", () => {
  it("orders guide sections from routing to shared conventions", () => {
    const guide = buildMcpQuickStart();
    const headings = guide.match(/^#{1,2} .+$/gm);

    expect(headings).toEqual([
      "# GitHits",
      "## Choose a tool",
      "## Dependency upgrades",
      "## Workflow",
      "## Targets",
      "## Results",
      "## Research",
      "## External-content posture",
    ]);
    expect(guide).not.toMatch(/public OSS/i);
    expect(guide).not.toMatch(/^\*\*.+\*\*$/m);
  });

  it("documents canonical target conventions shared by every tool", () => {
    const guide = normalized(buildMcpQuickStart());

    for (const phrase of [
      "`<registry>:<name>@version` such as `npm:express`",
      "`github:owner/repo@ref`",
      "`site:host[/path]`",
      "swift:github.com/<owner>/<repo>",
      "zig:gh/<owner>/<repo>",
      "covers its package subpath, including in monorepos",
      "Paths and path filters are relative to that package root",
      "Paths and path filters are relative to the repository root",
      "Reuse returned target/path pairs",
      "Keep the original target and path filters when retrying the same scope",
      "whole repositories or sibling packages",
      "Never infer a provider",
      "Omit the suffix for the latest package version or default branch",
      "`#` selects a symbol or heading, never a revision",
    ]) {
      expect(guide).toContain(phrase);
    }
    expect(guide).not.toContain("[@version]");
    expect(guide).not.toContain("[@ref]");
  });

  it("describes the cross-tool workflow without repeating tool mechanics", () => {
    const guide = normalized(buildMcpQuickStart());

    for (const phrase of [
      "use a known canonical target directly",
      "call `resolve_target` and follow its continuation rules; never auto-select an ambiguous candidate",
      "`search` by topic, `grep` for exact text, `list` for structure or an exact path",
      'search the package with `source:"docs"`',
      "`site:` target or page URL from a `[docs page]` hit",
      "`read` never lists directories",
      "support behavioral claims with source, tests, or call sites",
      "Required local checks, beyond package evidence",
      "Passing existing tests does not prove compatibility",
    ]) {
      expect(guide).toContain(phrase);
    }
    // Per-tool mechanics belong to the selected tool's description.
    for (const phrase of [
      "EXACT/HIGH",
      "name-status",
      "followUp",
      "selector",
    ]) {
      expect(guide).not.toContain(phrase);
    }
  });

  it("keeps result conventions common to every tool", () => {
    const guide = normalized(buildMcpQuickStart());

    for (const phrase of [
      "Omit `format`",
      "Use JSON only when code consumes the raw response or a required field is missing from text",
      "Reuse returned target/path pairs, locators, references, and ranges unchanged; never invent them",
      "Follow rendered continuation and recovery actions instead of repeating or polling calls",
      "Omit `wait_timeout_ms` for the default; `0` returns without waiting",
      "Cite tool-owned provenance, including example source repositories",
      "report coverage, truncation, and other evidence limits",
    ]) {
      expect(guide).toContain(phrase);
    }
  });

  it("routes research on the stable guide with its contract", () => {
    const raw = buildMcpQuickStart();
    const guide = normalized(raw);

    expect(raw).toContain(
      "| Answer a question about an OSS package or repository with sources | `research` |",
    );
    for (const phrase of [
      "Inputs are sent to GitHits. Never send credentials, personal data, private or proprietary content, local paths, or private targets.",
      "`research` researches a public repository or package to answer a question with sources",
      "Omit `target` and `thread_id` for question-only lookup",
      "For candidates, retry with the one matching the question's project as `target`",
      "Reuse a returned `thread_id` for follow-ups",
      "Change project, version, or topic in the follow-up question",
      RESEARCH_VERIFIED_ANSWER_GUIDANCE,
      'Sources default to MCP read calls; use `source_format:"url"` for original upstream URLs',
      "Do not invent or rewrite sources",
      "Research takes the project's package or repository instead; it covers code and docs",
    ]) {
      expect(guide).toContain(phrase);
    }
    // The privacy sentence stays attached to the research guidance.
    expect(raw.split("## Research")[1]).toContain(
      "Inputs are sent to GitHits.",
    );
    expect(raw).not.toContain("Local experimental tools");
  });

  it("states the private-input boundary and skill/quick_start equivalence", () => {
    const guide = normalized(buildMcpQuickStart());

    expect(guide).toContain(
      "never send private code, local paths, credentials, or personal data",
    );
    expect(guide).toContain(
      "This guide is both the `githits-mcp` skill and the `quick_start` result; once either is loaded, do not call `quick_start`",
    );
  });
});

describe("buildLocalMcpQuickStart", () => {
  it("keeps deprecated instruction builders as exact compatibility aliases", () => {
    expect(buildMcpInstructions()).toBe(buildMcpQuickStart());
    expect(
      buildLocalMcpInstructions({
        enabledExperimentalTools: EXPERIMENTAL_TOOLS,
      }),
    ).toBe(
      buildLocalMcpQuickStart({
        enabledExperimentalTools: EXPERIMENTAL_TOOLS,
      }),
    );
  });

  it("keeps disabled tools byte-for-byte equal to the public guide", () => {
    const baseline = buildMcpQuickStart();
    expect(buildLocal([])).toBe(baseline);
  });

  it("appends enabled experimental guidance after the public guide", () => {
    const instructions = buildLocal(EXPERIMENTAL_TOOLS);

    expect(instructions.startsWith(buildMcpQuickStart())).toBe(true);
    expect(instructions).toContain("## Local experimental tools");
    expect(instructions).toContain("credentials");
    expect(instructions).toContain("private or proprietary content");
    expect(instructions).toContain(`targets.\n\n${PROBE_TOOL.guidance}`);
    expect(instructions).not.toContain("Issue reporting");
    expect(instructions).not.toContain("accepted: false");
  });

  it("adds no local section while no experimental tool is enabled", () => {
    expect(buildLocal([])).not.toContain("Local experimental tools");
    expect(buildLocal([])).not.toContain("`probe`");
  });
});
