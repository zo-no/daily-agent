/** Development-only Agent instance for synthetic daily work log Tool inspection. */
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { normalizeDeepSeekBaseUrl } from "../infrastructure/ai/deepseek-execution.mjs";
import { createDailyLogAgent } from "./agents/daily-log/index.mjs";

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

export const dailyLogStudioAgent = createDailyLogAgent({
  model: deepseek.chatModel(modelId)
});
