/** Authenticated, bounded, strict server boundary for one content-improvement proposal. */

import { z } from "zod";
import {
  AI_TIMEOUT_MS,
  AiClassifierError,
  bearerToken,
  errorResponse,
  hasAllowedOrigin,
  hasJsonContentType,
  jsonResponse,
  readJsonBody
} from "../../../shared/ai/http-boundary.mjs";
import {
  CONTENT_IMPROVEMENT_SCHEMA_VERSION,
  MAX_CONTENT_IMPROVEMENT_RESULT_CHARS,
  MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS,
  contentImprovementInstructions,
  normalizeContentImprovementOutput,
  sanitizeContentImprovementInput,
  validateContentImprovementResponse
} from "./model.mjs";
import { runDeepSeekProposal } from "../../../infrastructure/ai/deepseek-execution.mjs";
import { toDeepSeekRouteError } from "../../../infrastructure/ai/route-error.mjs";

const inputSchema = z.object({
  schemaVersion: z.literal(CONTENT_IMPROVEMENT_SCHEMA_VERSION),
  requestId: z.string().min(8).max(128),
  target: z.string().min(8).max(128),
  sourceFingerprint: z.string().min(8).max(64),
  locale: z.enum(["zh-CN", "en"]),
  content: z.string().min(1).max(MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS)
}).strict();
const outputSchema = z.object({
  improvedContent: z.string().min(1).max(MAX_CONTENT_IMPROVEMENT_RESULT_CHARS)
}).strict();

function invalidInput(error) {
  return new AiClassifierError(
    "AI_CONTENT_IMPROVEMENT_INPUT_INVALID",
    "content improvement request is invalid",
    400,
    { cause: error }
  );
}

function invalidResponse(error) {
  return new AiClassifierError(
    "AI_CONTENT_IMPROVEMENT_RESPONSE_INVALID",
    "model returned an invalid content improvement",
    502,
    { cause: error }
  );
}

export async function improveContentWithDeepSeek(rawInput, {
  apiKey = process.env.DEEPSEEK_API_KEY,
  baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  fetchImpl = globalThis.fetch,
  model = process.env.DEEPSEEK_MODEL || "deepseek-chat",
  timeoutMs = AI_TIMEOUT_MS
} = {}) {
  let input;
  try {
    input = sanitizeContentImprovementInput(rawInput);
  } catch (error) {
    throw invalidInput(error);
  }
  try {
    return await runDeepSeekProposal(input, {
      apiKey,
      baseUrl,
      fetchImpl,
      model,
      timeoutMs,
      capabilityId: "content-improvement",
      instructions: contentImprovementInstructions(input.locale),
      inputSchema,
      outputSchema,
      normalize: (value, runtimeInput) => normalizeContentImprovementOutput(value, runtimeInput),
      modelSettings: { temperature: 0.2, maxOutputTokens: 1400 }
    });
  } catch (error) {
    throw toDeepSeekRouteError(error, {
      invalidOutput: invalidResponse,
      unavailable: { code: "AI_UNAVAILABLE", message: "content improvement failed" },
      sharedMessages: {
        "not-configured": "content improvement is not configured",
        "config-invalid": "content improvement configuration is invalid"
      }
    });
  }
}

export async function postContentImprovement(request, {
  improve = improveContentWithDeepSeek,
  rateLimit = () => true,
  verifyAccessToken
} = {}) {
  if (!hasAllowedOrigin(request)) {
    return errorResponse(new AiClassifierError("AI_ORIGIN_FORBIDDEN", "cross-origin analysis is not allowed", 403));
  }
  if (!hasJsonContentType(request)) {
    return errorResponse(new AiClassifierError("AI_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415));
  }
  const token = bearerToken(request);
  if (!token) return errorResponse(new AiClassifierError("AI_AUTH_REQUIRED", "a valid account session is required", 401));
  if (typeof verifyAccessToken !== "function") {
    return errorResponse(new AiClassifierError("AI_AUTH_UNAVAILABLE", "account verification is unavailable", 503));
  }

  try {
    const user = await verifyAccessToken(token);
    if (!user?.id) throw new AiClassifierError("AI_AUTH_INVALID", "account session is invalid", 401);
    if (!rateLimit(user.id)) throw new AiClassifierError("AI_REQUEST_RATE_LIMITED", "too many analysis requests", 429);
    let input;
    try {
      input = sanitizeContentImprovementInput(await readJsonBody(request));
    } catch (error) {
      if (error instanceof AiClassifierError) throw error;
      throw invalidInput(error);
    }
    const result = await improve(input);
    try {
      return jsonResponse(validateContentImprovementResponse(result, input));
    } catch (error) {
      throw invalidResponse(error);
    }
  } catch (error) {
    return errorResponse(error);
  }
}
