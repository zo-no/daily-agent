import { Mastra } from "@mastra/core/mastra";
import {
  domainDailySummaryStudioAgent,
  domainDailySummaryStudioWorkflow
} from "./studio-domain-daily-summary.mjs";
import {
  calendarDiaryReviewStudioAgent,
  calendarDiaryReviewStudioWorkflow
} from "./studio-calendar-diary-review.mjs";
import { dailyLogStudioAgent } from "./studio-daily-log.mjs";
import { prepareDailyLogTool } from "./tools/daily-log/index.mjs";

/**
 * Development-only entry point for Mastra Studio.
 *
 * This registers bounded, synthetic-input debugging surfaces. Log Note's production AI capabilities
 * remain request-scoped in index.mjs and never route account data through Studio. LN-082's standalone
 * Tool prepares an unsaved candidate only; it has no product read or write authority.
 */
export const mastra = new Mastra({
  agents: { domainDailySummaryStudioAgent, calendarDiaryReviewStudioAgent, dailyLogStudioAgent },
  workflows: { domainDailySummaryStudioWorkflow, calendarDiaryReviewStudioWorkflow },
  tools: { prepareDailyLogTool },
  logger: false
});
