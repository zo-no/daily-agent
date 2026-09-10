/** Authenticated, bounded server boundary for transient general chat. */
import { z } from "zod";
import { AiClassifierError, bearerToken, errorResponse, hasAllowedOrigin, hasJsonContentType, jsonResponse, readJsonBody } from "../../../shared/ai/http-boundary.mjs";
import { runGeneralChatProposal } from "../../../infrastructure/ai/general-chat-execution.mjs";
import { toDeepSeekRouteError } from "../../../infrastructure/ai/route-error.mjs";
import { GENERAL_CHAT_SCHEMA_VERSION, MAX_CHAT_MESSAGE_CHARS, MAX_CHAT_MESSAGES, MAX_CHAT_REPLY_CHARS, chatInstructions, normalizeGeneralChatOutput, sanitizeGeneralChatInput, validateGeneralChatResponse } from "./model.mjs";

const inputSchema = z.object({ schemaVersion: z.literal(GENERAL_CHAT_SCHEMA_VERSION), requestId: z.string().min(8).max(128), locale: z.enum(["en", "zh-CN"]), messages: z.array(z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().min(1).max(MAX_CHAT_MESSAGE_CHARS) }).strict(),
  z.object({ role: z.literal("assistant"), content: z.string().min(1).max(MAX_CHAT_REPLY_CHARS) }).strict()
])).min(1).max(MAX_CHAT_MESSAGES) }).strict();
const outputSchema = z.object({ reply: z.string().min(1).max(MAX_CHAT_REPLY_CHARS) }).strict();

export async function chatWithGeneralAgent(rawInput, options = {}) {
  let input;
  try { input = sanitizeGeneralChatInput(rawInput); } catch (error) { throw new AiClassifierError("AI_GENERAL_CHAT_INPUT_INVALID", "chat request is invalid", 400, { cause: error }); }
  try {
    return await runGeneralChatProposal(input, {
      ...options,
      capabilityId: "general-chat",
      instructions: chatInstructions(input.locale),
      inputSchema,
      outputSchema,
      normalize: (value, runtimeInput, model) => normalizeGeneralChatOutput(value, runtimeInput, model),
      modelSettings: { temperature: 0.4, maxOutputTokens: 900 },
    });
  } catch (error) {
    throw toDeepSeekRouteError(error, { unavailable: { code: "AI_UNAVAILABLE", message: "general chat failed" }, sharedMessages: { "not-configured": "general chat is not configured", "config-invalid": "general chat configuration is invalid" } });
  }
}

export async function postGeneralChat(request, { chat = chatWithGeneralAgent, rateLimit = () => true, verifyAccessToken } = {}) {
  if (!hasAllowedOrigin(request)) return errorResponse(new AiClassifierError("AI_ORIGIN_FORBIDDEN", "cross-origin analysis is not allowed", 403));
  if (!hasJsonContentType(request)) return errorResponse(new AiClassifierError("AI_CONTENT_TYPE_REQUIRED", "Content-Type must be application/json", 415));
  const token = bearerToken(request);
  if (!token) return errorResponse(new AiClassifierError("AI_AUTH_REQUIRED", "a valid account session is required", 401));
  if (typeof verifyAccessToken !== "function") return errorResponse(new AiClassifierError("AI_AUTH_UNAVAILABLE", "account verification is unavailable", 503));
  try {
    const user = await verifyAccessToken(token);
    if (!user?.id) throw new AiClassifierError("AI_AUTH_INVALID", "account session is invalid", 401);
    if (!rateLimit(user.id)) throw new AiClassifierError("AI_REQUEST_RATE_LIMITED", "too many analysis requests", 429);
    const body = await readJsonBody(request);
    let input;
    try { input = sanitizeGeneralChatInput(body); }
    catch (error) { throw new AiClassifierError("AI_GENERAL_CHAT_INPUT_INVALID", "chat request is invalid", 400, { cause: error }); }
    const result = await chat(input);
    try { return jsonResponse(validateGeneralChatResponse(result, input)); }
    catch (error) { throw new AiClassifierError("AI_GENERAL_CHAT_RESPONSE_INVALID", "chat response is invalid", 502, { cause: error }); }
  } catch (error) { return errorResponse(error); }
}

export const postChat = postGeneralChat;
