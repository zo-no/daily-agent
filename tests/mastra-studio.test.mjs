import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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
import { dailyLogStudioAgent } from "../src/mastra/studio-daily-log.mjs";
import { prepareDailyLogTool } from "../src/mastra/tools/daily-log/index.mjs";

test("Studio registers only the bounded development Agents, Workflows, and preview Tool", () => {
  const studio = new Mastra({
    agents: { domainDailySummaryStudioAgent, calendarDiaryReviewStudioAgent, dailyLogStudioAgent },
    workflows: { domainDailySummaryStudioWorkflow, calendarDiaryReviewStudioWorkflow },
    tools: { prepareDailyLogTool },
    logger: false
  });

  assert.equal(studio.getAgent("domainDailySummaryStudioAgent").id, "domain-daily-summary-agent");
  assert.equal(studio.getWorkflow("domainDailySummaryStudioWorkflow").id, "domain-daily-summary-workflow");
  assert.equal(studio.getAgent("calendarDiaryReviewStudioAgent").id, "calendar-diary-review-agent");
  assert.equal(studio.getWorkflow("calendarDiaryReviewStudioWorkflow").id, "calendar-diary-review-human-reviewed-workflow");
  assert.equal(studio.getAgent("dailyLogStudioAgent").id, "daily-log-agent");
  assert.equal(studio.getTool("prepareDailyLogTool").id, "prepare-daily-log");
  assert.equal(studio.getToolById("prepare-daily-log"), prepareDailyLogTool);
});

test("Studio entry registers the daily log Agent and standalone Tool", async () => {
  const source = await readFile(new URL("../src/mastra/index.ts", import.meta.url), "utf8");

  assert.match(source, /agents:\s*\{[^}]*dailyLogStudioAgent[^}]*\}/s);
  assert.match(source, /tools:\s*\{[^}]*prepareDailyLogTool[^}]*\}/s);
  assert.match(source, /from "\.\/studio-daily-log\.mjs"/);
  assert.match(source, /from "\.\/tools\/daily-log\/index\.mjs"/);
});
