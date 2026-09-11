import { createTool } from "@mastra/core/tools";
import { listPlansInputSchema, listPlansOutputSchema, listPlans } from "../../../modules/agent-bridge/read-only-query.mjs";

export const LIST_PLANS_TOOL_ID = "list-plans";

export const listPlansTool = createTool({
  id: LIST_PLANS_TOOL_ID,
  description: "List the user's plans for a specific date when checking availability or recalling scheduled work. Read-only and marks Google plans as read-only.",
  inputSchema: listPlansInputSchema,
  outputSchema: listPlansOutputSchema,
  execute: async (input, context) => {
    if (context?.abortSignal?.aborted) throw new DOMException("Plan listing was aborted", "AbortError");
    const adapter = context?.requestContext?.get?.("logNoteReadOnlyAdapter") || context?.logNoteReadOnlyAdapter;
    return listPlans(input, adapter);
  }
});
