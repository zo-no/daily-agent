import { Mastra } from "@mastra/core/mastra";
import {
  domainDailySummaryStudioAgent,
  domainDailySummaryStudioWorkflow
} from "./studio-domain-daily-summary.mjs";
import {
  calendarDiaryReviewStudioAgent,
  calendarDiaryReviewStudioWorkflow
} from "./studio-calendar-diary-review.mjs";

/**
 * Development-only entry point for Mastra Studio.
 *
 * This registers two bounded, synthetic-input debugging surfaces. Log Note's production AI
 * capabilities remain request-scoped in index.mjs and never route account data through Studio.
 */
export const mastra = new Mastra({
  agents: { domainDailySummaryStudioAgent, calendarDiaryReviewStudioAgent },
  workflows: { domainDailySummaryStudioWorkflow, calendarDiaryReviewStudioWorkflow },
  logger: false
});
