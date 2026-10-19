import {
  type CodeNavigationService,
  MalformedCodeNavigationResponseError,
  type ReadService,
} from "@githits/core-internal";
import { serviceRequestArgs } from "./service-request-args.js";

/**
 * Adapt a unified reader to the existing code-read presentation seam. An
 * optional caller signal is forwarded so cancellation aborts the read request.
 */
export function createReadFileServiceAdapter(
  readService: ReadService,
  target: string,
  signal?: AbortSignal,
): Pick<CodeNavigationService, "readFile"> {
  return {
    readFile: async (params) => {
      // The parsed params.target drives presentation; transport keeps the compact target byte-for-byte.
      const response = await readService.read(
        {
          target,
          path: params.filePath,
          startLine: params.startLine,
          endLine: params.endLine,
          waitTimeoutMs: params.waitTimeoutMs,
        },
        ...serviceRequestArgs(signal),
      );
      if (response.source !== "code") {
        throw new MalformedCodeNavigationResponseError(
          "Malformed response from code navigation service.",
        );
      }
      return response.result;
    },
  };
}
