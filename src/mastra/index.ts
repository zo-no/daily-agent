/**
 * @fileoverview Registers synthetic-input Mastra Studio agents and tools; production AI stays outside Studio.
 */

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

export const mastra = new Mastra({
  agents: { domainDailySummaryStudioAgent, calendarDiaryReviewStudioAgent, dailyLogStudioAgent },
  workflows: { domainDailySummaryStudioWorkflow, calendarDiaryReviewStudioWorkflow },
  tools: { prepareDailyLogTool },
  logger: false
});
