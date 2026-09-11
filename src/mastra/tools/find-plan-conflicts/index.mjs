import { createTool } from "@mastra/core/tools";
import { findPlanConflictsInputSchema, findPlanConflictsOutputSchema, findPlanConflicts } from "../../../modules/agent-bridge/read-only-query.mjs";

export const FIND_PLAN_CONFLICTS_TOOL_ID = "find-plan-conflicts";

export const findPlanConflictsTool = createTool({
  id: FIND_PLAN_CONFLICTS_TOOL_ID,
  description: "Check a specific day's plans for overlapping time blocks or titles too short to execute. Call before suggesting schedule changes; never modify plans.",
  inputSchema: findPlanConflictsInputSchema,
  outputSchema: findPlanConflictsOutputSchema,
  execute: async (input, context) => {
    if (context?.abortSignal?.aborted) throw new DOMException("Plan conflict check was aborted", "AbortError");
    const adapter = context?.requestContext?.get?.("logNoteReadOnlyAdapter") || context?.logNoteReadOnlyAdapter;
    return findPlanConflicts(input, adapter);
  }
});
