/** @fileoverview Translate shared DeepSeek/Mastra failures into stable route errors. */

import { AiClassifierError } from "../../shared/ai/http-boundary.mjs";
import { classifyDeepSeekFailure } from "./deepseek-execution.mjs";

const sharedFailures = {
  "not-configured": ["AI_NOT_CONFIGURED", "DeepSeek is not configured", 503],
  "config-invalid": ["AI_CONFIG_INVALID", "DeepSeek configuration is invalid", 503],
  "transport-unavailable": ["AI_FETCH_UNAVAILABLE", "model transport is unavailable", 503],
  timeout: ["AI_TIMEOUT", "model request timed out", 504],
  "rate-limited": ["AI_RATE_LIMITED", "model rate limit exceeded", 429]
};

function errorTuple(value, fallback) {
  if (!value) return fallback;
  return [value.code, value.message, value.status || 502];
}

function configuredError(value, fallback, cause) {
  if (typeof value === "function") return value(cause);
  return new AiClassifierError(...errorTuple(value, fallback));
}

/** Return the existing route-safe error without exposing a provider cause. */
export function toDeepSeekRouteError(error, {
  invalidOutput,
  responseTooLarge = invalidOutput,
  upstream,
  unavailable,
  sharedMessage,
  sharedMessages = {}
} = {}) {
  if (error instanceof AiClassifierError) return error;

  const failure = classifyDeepSeekFailure(error);
  const shared = sharedFailures[failure];
  if (shared) return new AiClassifierError(shared[0], sharedMessages[failure] || sharedMessage || shared[1], shared[2]);
  if (failure === "invalid-output") return configuredError(invalidOutput, unavailable, error);
  if (failure === "response-too-large") return configuredError(responseTooLarge, unavailable, error);
  if (failure === "upstream-error") return configuredError(upstream, unavailable, error);
  return configuredError(unavailable, {
    code: "AI_UNAVAILABLE",
    message: "model request failed",
    status: 502
  }, error);
}
