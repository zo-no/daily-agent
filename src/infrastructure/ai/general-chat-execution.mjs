/** Infrastructure adapter for the general Agent and its preview-only Tool. */
import { runDeepSeekProposal } from "./deepseek-execution.mjs";
import { prepareDailyLogTool } from "../../mastra/tools/daily-log/index.mjs";

export function runGeneralChatProposal(input, options = {}) {
  return runDeepSeekProposal(input, {
    ...options,
    capabilityId: "general-chat",
    tools: { [prepareDailyLogTool.id]: prepareDailyLogTool },
    toolChoice: "auto",
    maxSteps: 2
  });
}
