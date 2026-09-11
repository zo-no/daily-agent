import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { normalizeDeepSeekBaseUrl } from "../infrastructure/ai/deepseek-execution.mjs";
import { createChangePreviewAgent } from "./agents/change-preview/index.mjs";

const modelId = process.env.DEEPSEEK_MODEL?.trim() || "deepseek-chat";
const deepseek = createOpenAICompatible({
  name: "deepseek-studio",
  apiKey: process.env.DEEPSEEK_API_KEY?.trim(),
  baseURL: normalizeDeepSeekBaseUrl(process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com"),
  supportsStructuredOutputs: true,
  transformRequestBody: (body) => ({ ...body, response_format: { type: "json_object" } })
});

export const changePreviewStudioAgent = createChangePreviewAgent({
  model: deepseek.chatModel(modelId)
});
