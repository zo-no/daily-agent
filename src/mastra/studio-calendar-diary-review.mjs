/** Development-only Studio registration for synthetic Calendar/diary Human-in-the-loop review. */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { normalizeCalendarDiaryReviewOutput, sanitizeCalendarDiaryReviewInput } from "../lib/daily-calendar-review-model.mjs";
import { calendarDiaryReviewInputSchema, calendarDiaryReviewInstructions, calendarDiaryReviewOutputSchema } from "../lib/daily-calendar-review-route.mjs";
import { normalizeDeepSeekBaseUrl } from "../lib/deepseek-model.mjs";
import { createStructuredProposalAgent } from "./agents/structured-proposal-agent.mjs";
import { createHumanReviewedProposalWorkflow } from "./workflows/human-reviewed-proposal-workflow.mjs";

const modelId = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
const deepseek = createOpenAICompatible({ name: "deepseek-studio", apiKey: process.env.DEEPSEEK_API_KEY?.trim(), baseURL: normalizeDeepSeekBaseUrl(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"), supportsStructuredOutputs: true, transformRequestBody: (body) => ({ ...body, response_format: { type: "json_object" } }) });

export const calendarDiaryReviewStudioAgent = createStructuredProposalAgent({ capabilityId: "calendar-diary-review", model: deepseek.chatModel(modelId), instructions: calendarDiaryReviewInstructions() });
export const calendarDiaryReviewStudioWorkflow = createHumanReviewedProposalWorkflow({ capabilityId: "calendar-diary-review", agent: calendarDiaryReviewStudioAgent, inputSchema: calendarDiaryReviewInputSchema, outputSchema: calendarDiaryReviewOutputSchema, sanitize: sanitizeCalendarDiaryReviewInput, normalize: (value, input) => normalizeCalendarDiaryReviewOutput(value, input, Date.now(), `studio:deepseek:${modelId}`), modelSettings: { temperature: 0.1, maxOutputTokens: 1600 } });
