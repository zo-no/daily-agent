import { createTool } from "@mastra/core/tools";
import { planPreviewInputSchema, changePreviewOutputSchema } from "../../../../modules/agent-bridge/change-preview/index.mjs";
import { preparePlanPreview } from "../../../../modules/agent-bridge/change-preview/index.mjs";

export const PREPARE_PLAN_PREVIEW_TOOL_ID = "prepare-plan-draft";

export const preparePlanPreviewTool = createTool({
  id: PREPARE_PLAN_PREVIEW_TOOL_ID,
  description: "Prepare an unsaved plan create, update, or delete preview from explicit state and draft data.",
  inputSchema: planPreviewInputSchema,
  outputSchema: changePreviewOutputSchema,
  execute: async (inputData, context) => preparePlanPreview(inputData, context)
});
