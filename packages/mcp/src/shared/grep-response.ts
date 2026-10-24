import { type GrepResult, parseGrepResult } from "@githits/core-internal";

/** Preserve selected wire fields, including path advisories, without aliasing provider data. */
export function projectGrepResult(result: GrepResult): GrepResult {
  // The wire contract requires the array; injected providers may predate it.
  const projected = parseGrepResult({
    ...result,
    indexingEstimates: result.indexingEstimates ?? [],
  });
  if (result.indexingEstimates === undefined)
    delete projected.indexingEstimates;
  return projected;
}
