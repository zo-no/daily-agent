import { createTool } from "@mastra/core/tools";
import { recordPreviewInputSchema, changePreviewOutputSchema, prepareRecordPreview } from "../../../../modules/agent-bridge/change-preview/index.mjs";

export const PREPARE_RECORD_PREVIEW_TOOL_ID = "prepare-record-draft";

export const prepareRecordPreviewTool = createTool({
  id: PREPARE_RECORD_PREVIEW_TOOL_ID,
  description: "Prepare an unsaved record create, update, or delete preview from explicit state and draft data.",
  inputSchema: recordPreviewInputSchema,
  outputSchema: changePreviewOutputSchema,
  execute: async (inputData, context) => prepareRecordPreview(inputData, context)
});
