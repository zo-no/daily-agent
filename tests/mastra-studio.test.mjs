import assert from "node:assert/strict";
import test from "node:test";

import { Mastra } from "@mastra/core/mastra";
import {
  domainDailySummaryStudioAgent,
  domainDailySummaryStudioWorkflow
} from "../src/mastra/studio-domain-daily-summary.mjs";
import {
  calendarDiaryReviewStudioAgent,
  calendarDiaryReviewStudioWorkflow
} from "../src/mastra/studio-calendar-diary-review.mjs";

test("Studio registers only the bounded development Agents and Workflows", () => {
  const studio = new Mastra({
    agents: { domainDailySummaryStudioAgent, calendarDiaryReviewStudioAgent },
    workflows: { domainDailySummaryStudioWorkflow, calendarDiaryReviewStudioWorkflow },
    logger: false
  });

  assert.equal(studio.getAgent("domainDailySummaryStudioAgent").id, "domain-daily-summary-agent");
  assert.equal(studio.getWorkflow("domainDailySummaryStudioWorkflow").id, "domain-daily-summary-workflow");
  assert.equal(studio.getAgent("calendarDiaryReviewStudioAgent").id, "calendar-diary-review-agent");
  assert.equal(studio.getWorkflow("calendarDiaryReviewStudioWorkflow").id, "calendar-diary-review-human-reviewed-workflow");
});
