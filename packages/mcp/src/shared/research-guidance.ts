/**
 * Shared guidance for how agents treat a Research answer, used verbatim by the
 * CLI command help, the local MCP tool description, and local MCP instructions.
 *
 * Agents treated cited sources as next steps and re-read them after a complete
 * answer. The answer was already verified against those sources, so they are
 * citations; a source is read only when the answer lacks a needed detail.
 *
 * Agents also wrote research questions asking for "a source-cited overview",
 * which sources already cover; a direct question avoids overview-style answers
 * that invite follow-up lookups (7 of 15 questions in the 2026-10-14 Codex
 * benchmark asked for citations or an overview).
 */
export const RESEARCH_VERIFIED_ANSWER_GUIDANCE =
  "Returns a verified answer that always includes its sources, so ask the question directly without requesting citations, an overview or a source-cited answer. Cite those sources directly; read one only when the answer lacks a detail you need.";
