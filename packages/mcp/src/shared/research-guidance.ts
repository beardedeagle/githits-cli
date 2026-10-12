/**
 * Shared guidance for how agents treat a Research answer, used verbatim by the
 * CLI command help, the local MCP tool description, and local MCP instructions.
 *
 * Agents treated cited sources as next steps and re-read them after a complete
 * answer. The answer was already verified against those sources, so they are
 * citations; a source is read only when the answer lacks a needed detail.
 */
export const RESEARCH_VERIFIED_ANSWER_GUIDANCE =
  "Returns a verified answer with its sources. Cite those sources directly; read one only when the answer lacks a detail you need.";
