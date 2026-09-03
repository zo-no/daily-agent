import assert from "node:assert/strict";
import test from "node:test";

import { Mastra } from "@mastra/core/mastra";
import {
  domainDailySummaryStudioAgent,
  domainDailySummaryStudioWorkflow
} from "../src/mastra/studio-domain-daily-summary.mjs";

test("Studio registers the bounded domain daily summary Agent and Workflow", () => {
  const studio = new Mastra({
    agents: { domainDailySummaryStudioAgent },
    workflows: { domainDailySummaryStudioWorkflow },
    logger: false
  });

  assert.equal(studio.getAgent("domainDailySummaryStudioAgent").id, "domain-daily-summary-agent");
  assert.equal(studio.getWorkflow("domainDailySummaryStudioWorkflow").id, "domain-daily-summary-workflow");
});
