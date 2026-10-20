import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpProgressAnimationOptions } from "../progress/progress-animator.js";
import type { McpProgressHook } from "../progress/relay-receiver.js";
import type { McpToolServices } from "../tools/tool-services.js";
import type { ToolTermsRemediation } from "../tools/types.js";
import {
  buildLocalMcpQuickStart,
  type LocalExperimentalToolGuidance,
} from "./instructions.js";
import {
  createDescriptorServices,
  createMcpServerWithFactories,
  createStableMcpToolFactories,
  type McpAuthAction,
  type McpRequestContext,
  type McpServerMetadata,
  type McpToolExecutionHook,
  type McpToolFactory,
} from "./server.js";

export interface LocalExperimentalMcpPolicy {
  tools: boolean;
}

/**
 * Services for the local stdio server. Identical to the public seam while no
 * local-only experimental tool needs an extra service; a future experiment
 * extends this type instead of widening `McpToolServices`.
 */
export type LocalMcpToolServices = McpToolServices;

export type LocalMcpToolServicesProvider<TExtra = unknown> =
  | LocalMcpToolServices
  | ((
      context: McpRequestContext<TExtra>,
    ) => LocalMcpToolServices | Promise<LocalMcpToolServices>);

/** A local-only dogfood tool and the quick-start guidance it adds. */
export interface LocalExperimentalToolDefinition
  extends LocalExperimentalToolGuidance {
  factory: McpToolFactory<LocalMcpToolServices>;
}

/**
 * Local-only experimental tools enabled by `[experimental] tools = true` or
 * the hidden `--experimental-tools` flag. Empty while nothing is in dogfood:
 * the opt-in then yields exactly the stable inventory and guide.
 */
export const LOCAL_EXPERIMENTAL_TOOL_DEFINITIONS: readonly LocalExperimentalToolDefinition[] =
  [];

export interface CreateLocalMcpServerOptions<TExtra = unknown> {
  metadata: McpServerMetadata;
  services: LocalMcpToolServicesProvider<TExtra>;
  policy: LocalExperimentalMcpPolicy;
  authAction?: McpAuthAction;
  termsRemediation?: ToolTermsRemediation;
  traceTool?: McpToolExecutionHook;
  /** Optional progress source; used only when the client sends a progress token. */
  progress?: McpProgressHook;
  /** Local animation of progress messages; defaults to on with `progress`. */
  progressAnimation?: McpProgressAnimationOptions | boolean;
  /** Experimental definitions; defaults to `LOCAL_EXPERIMENTAL_TOOL_DEFINITIONS`. */
  experimentalTools?: readonly LocalExperimentalToolDefinition[];
}

/** Compose the local MCP server while keeping local-only service requirements
 * and experimental policy outside the public package surface. */
export function createLocalMcpServer<TExtra = unknown>(
  options: CreateLocalMcpServerOptions<TExtra>,
): McpServer {
  const enabledExperimentalTools = options.policy.tools
    ? (options.experimentalTools ?? LOCAL_EXPERIMENTAL_TOOL_DEFINITIONS)
    : [];
  const quickStartGuide = buildLocalMcpQuickStart({
    enabledExperimentalTools,
  });
  const toolFactories: readonly McpToolFactory<LocalMcpToolServices>[] = [
    ...createStableMcpToolFactories(quickStartGuide),
    ...enabledExperimentalTools.map(({ factory }) => factory),
  ];
  return createMcpServerWithFactories({
    metadata: options.metadata,
    services: options.services,
    toolFactories,
    descriptorServices: createDescriptorServices(),
    authAction: options.authAction,
    termsRemediation: options.termsRemediation,
    traceTool: options.traceTool,
    progress: options.progress,
    progressAnimation: options.progressAnimation,
  });
}
