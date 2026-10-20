/**
 * Rotating spinner labels per command. Each list cycles every ~2s while
 * a command waits on the GitHits backend, so long requests feel alive.
 */
export const SPINNER_MESSAGES = {
  // Research and examples show live backend progress; these labels only cover
  // the moments before the first update or when progress is unavailable.
  research: ["Researching..."],
  example: ["Searching source code and docs..."],
  search: [
    "Exploring repositories...",
    "Tracing symbols...",
    "Inspecting dependencies...",
    "Scanning source code...",
  ],
  code: [
    "Inspecting source code...",
    "Resolving symbols...",
    "Reading dependency internals...",
  ],
  docs: [
    "Reading documentation...",
    "Resolving references...",
    "Collecting package docs...",
  ],
  list: [
    "Listing indexed paths...",
    "Checking inventory coverage...",
    "Preparing matching entries...",
  ],
} as const;
