import type { ListPackageDocsParams } from "@githits/core-internal";
import {
  PKGSEER_REGISTRY_LIST,
  type PkgseerRegistry,
  parsePkgseerRegistryArg,
  toPkgseerRegistry,
} from "@githits/core-internal";
import {
  InvalidPackageSpecError,
  UnsupportedRegistryError,
} from "./package-spec.js";
import { normalisePackageVersion } from "./package-version.js";

export interface ListPackageDocsRequestInput {
  registry: string;
  packageName: string;
  version?: string;
  limit?: number;
  after?: string;
}

export interface ListPackageDocsRequestBuildResult {
  params: ListPackageDocsParams;
  limitExplicit: boolean;
  afterExplicit: boolean;
}

export function buildListPackageDocsParams(
  input: ListPackageDocsRequestInput,
): ListPackageDocsRequestBuildResult {
  const rawPackageName = input.packageName?.trim() ?? "";
  if (!rawPackageName) {
    throw new InvalidPackageSpecError("Package name is required.");
  }

  const registry = parsePkgseerRegistryArg(input.registry ?? "");
  if (!registry) {
    throw new UnsupportedRegistryError(
      `Unsupported registry '${input.registry}'. Supported: ${PKGSEER_REGISTRY_LIST}.`,
    );
  }

  const backendRegistry = toPkgseerRegistry(registry);
  const params: ListPackageDocsParams = {
    registry: backendRegistry,
    packageName: normalisePackageName(rawPackageName, backendRegistry),
  };

  const version = normalisePackageVersion(input.version, backendRegistry);
  if (version !== undefined) params.version = version;

  const after = input.after?.trim();
  if (after) params.after = after;

  if (input.limit !== undefined) {
    if (
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 500
    ) {
      throw new InvalidPackageSpecError(
        "Limit must be an integer between 1 and 500.",
      );
    }
    params.limit = input.limit;
  }

  return {
    params,
    limitExplicit: input.limit !== undefined,
    afterExplicit: Boolean(after),
  };
}

function normalisePackageName(
  packageName: string,
  registry: PkgseerRegistry,
): string {
  if (registry === "SWIFT" && /^github\.com\//i.test(packageName)) {
    return packageName.toLowerCase();
  }
  return packageName;
}
