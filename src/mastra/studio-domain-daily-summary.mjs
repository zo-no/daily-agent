/**
 * @fileoverview Development-only Studio registration for synthetic daily-summary debugging.
 *
 * This module never reads Log Note accounts or storage. Studio operators provide the complete
 * bounded input manually, and the shared capability normalizer still rejects unsupported output.
 */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import {
  domainDailySummaryInputSchema,
  domainDailySummaryInstructions,
  domainDailySummaryOutputSchema
} from "../lib/domain-daily-summary-route.mjs";
import { normalizeDomainDailySummaryOutput } from "../lib/domain-daily-summary-model.mjs";
import { normalizeDeepSeekBaseUrl } from "../lib/deepseek-model.mjs";
import { createStructuredProposalAgent } from "./agents/structured-proposal-agent.mjs";
import { createStructuredProposalWorkflow } from "./workflows/structured-proposal-workflow.mjs";

const modelId = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
const deepseek = createOpenAICompatible({
  name: "deepseek-studio",
  apiKey: process.env.DEEPSEEK_API_KEY?.trim(),
  baseURL: normalizeDeepSeekBaseUrl(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"),
  supportsStructuredOutputs: true,
  transformRequestBody: (body) => ({
    ...body,
    response_format: { type: "json_object" }
  })
});

export const domainDailySummaryStudioAgent = createStructuredProposalAgent({
  capabilityId: "domain-daily-summary",
  model: deepseek.chatModel(modelId),
  instructions: domainDailySummaryInstructions()
});

export const domainDailySummaryStudioWorkflow = createStructuredProposalWorkflow({
  capabilityId: "domain-daily-summary",
  agent: domainDailySummaryStudioAgent,
  inputSchema: domainDailySummaryInputSchema,
  outputSchema: domainDailySummaryOutputSchema,
  normalize: (value, input) => normalizeDomainDailySummaryOutput(
    value,
    input,
    Date.now(),
    `studio:deepseek:${modelId}`
  ),
  modelSettings: { temperature: 0.1, maxOutputTokens: 1200 }
});
