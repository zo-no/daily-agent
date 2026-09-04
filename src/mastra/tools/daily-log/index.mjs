import { createTool } from "@mastra/core/tools";
import {
  dailyLogInputSchema,
  dailyLogProposalSchema,
  prepareDailyLogProposal
} from "../../../modules/agent-bridge/daily-log/index.mjs";

export const PREPARE_DAILY_LOG_TOOL_ID = "prepare-daily-log";

export const prepareDailyLogTool = createTool({
  id: PREPARE_DAILY_LOG_TOOL_ID,
  description: "Prepare an unsaved daily work summary candidate from explicit bounded work facts.",
  inputSchema: dailyLogInputSchema,
  outputSchema: dailyLogProposalSchema,
  execute: async (inputData, context) => {
    if (context?.abortSignal?.aborted) {
      throw new DOMException("Daily log Tool execution was aborted", "AbortError");
    }
    return prepareDailyLogProposal(inputData);
  }
});
