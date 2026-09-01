/**
 * @fileoverview One bounded, request-scoped DeepSeek model construction boundary.
 */

import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { runStructuredProposal } from "../mastra/index.mjs";

export const MAX_DEEPSEEK_RESPONSE_BYTES = 512 * 1024;

export class DeepSeekModelError extends Error {
  constructor(code, message, status = 502, options = {}) {
    super(message, options);
    this.name = "DeepSeekModelError";
    this.code = code;
    this.status = status;
  }
}

function errorChainIncludes(error, predicate) {
  const pending = [error];
  const seen = new Set();
  while (pending.length) {
    const current = pending.shift();
    if (!current || seen.has(current)) continue;
    seen.add(current);
    if (predicate(current)) return true;
    for (const nested of [
      current.cause,
      current.error,
      current.originalError,
      current.details?.cause,
      current.details?.error
    ]) {
      if (nested && (typeof nested === "object" || typeof nested === "function")) {
        pending.push(nested);
      }
    }
  }
  return false;
}

/** Return a public-safe failure kind without exposing provider details. */
export function classifyDeepSeekFailure(error) {
  const matches = (codes) => errorChainIncludes(error, (candidate) => codes.includes(candidate?.code));
  if (matches(["AI_PROVIDER_NOT_CONFIGURED"])) return "not-configured";
  if (matches(["AI_PROVIDER_CONFIG_INVALID"])) return "config-invalid";
  if (matches(["AI_PROVIDER_TRANSPORT_UNAVAILABLE"])) return "transport-unavailable";
  if (matches(["AI_PROVIDER_TIMEOUT", "AI_RUNTIME_ABORTED"]) || error?.name === "AbortError") {
    return "timeout";
  }
  if (matches(["AI_PROVIDER_RESPONSE_TOO_LARGE", "AI_RUNTIME_RESPONSE_TOO_LARGE"])) {
    return "response-too-large";
  }
  if (matches(["AI_RUNTIME_RATE_LIMITED"])
    || errorChainIncludes(error, (candidate) => candidate?.statusCode === 429 || candidate?.status === 429)) {
    return "rate-limited";
  }
  if (matches(["AI_RUNTIME_INVALID_OUTPUT", "STRUCTURED_OUTPUT_SCHEMA_VALIDATION_FAILED"])
    || errorChainIncludes(error, (candidate) => (
      candidate?.name === "AI_NoObjectGeneratedError"
      || candidate?.name === "AI_NoOutputGeneratedError"
    ))) {
    return "invalid-output";
  }
  if (matches(["AI_RUNTIME_UPSTREAM_ERROR"])) return "upstream-error";
  return "unavailable";
}

export function normalizeDeepSeekBaseUrl(value) {
  let parsed;
  try {
    parsed = new URL(value || "https://api.deepseek.com");
  } catch {
    throw new DeepSeekModelError(
      "AI_PROVIDER_CONFIG_INVALID",
      "DeepSeek base URL is invalid",
      503
    );
  }
  const localHttp = parsed.protocol === "http:"
    && ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !localHttp) {
    throw new DeepSeekModelError(
      "AI_PROVIDER_CONFIG_INVALID",
      "DeepSeek base URL must use HTTPS",
      503
    );
  }
  return parsed.toString().replace(/\/$/, "");
}

function tooLargeError() {
  return new DeepSeekModelError(
    "AI_PROVIDER_RESPONSE_TOO_LARGE",
    "Model response exceeds 512 KiB",
    502
  );
}

/**
 * Bound a provider response before the AI provider parses untrusted JSON.
 */
export function createBoundedProviderFetch(
  fetchImpl,
  { maxResponseBytes = MAX_DEEPSEEK_RESPONSE_BYTES } = {}
) {
  if (typeof fetchImpl !== "function") {
    throw new DeepSeekModelError(
      "AI_PROVIDER_TRANSPORT_UNAVAILABLE",
      "Model transport is unavailable",
      503
    );
  }
  return async (...args) => {
    const response = await fetchImpl(...args);
    const declaredLength = Number(response?.headers?.get?.("content-length"));
    if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
      await response?.body?.cancel?.("response too large").catch(() => undefined);
      throw tooLargeError();
    }
    if (!response?.body || typeof response.body.getReader !== "function") return response;

    const reader = response.body.getReader();
    const chunks = [];
    let totalBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        totalBytes += value.byteLength;
        if (totalBytes > maxResponseBytes) {
          await reader.cancel("response too large").catch(() => undefined);
          throw tooLargeError();
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const headers = new Headers(response.headers);
    headers.set("content-length", String(totalBytes));
    return new Response(bytes, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  };
}

function timeoutError() {
  return new DeepSeekModelError(
    "AI_PROVIDER_TIMEOUT",
    "Model request timed out",
    504
  );
}

/**
 * Construct one request-scoped provider model and dispose its timeout afterward.
 */
export async function withDeepSeekModel({
  apiKey = process.env.DEEPSEEK_API_KEY,
  baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  fetchImpl = globalThis.fetch,
  model = process.env.DEEPSEEK_MODEL || "deepseek-chat",
  timeoutMs = 20_000
} = {}, execute) {
  const normalizedApiKey = typeof apiKey === "string" ? apiKey.trim() : "";
  if (!normalizedApiKey) {
    throw new DeepSeekModelError(
      "AI_PROVIDER_NOT_CONFIGURED",
      "DeepSeek is not configured",
      503
    );
  }
  if (typeof fetchImpl !== "function") {
    throw new DeepSeekModelError(
      "AI_PROVIDER_TRANSPORT_UNAVAILABLE",
      "Model transport is unavailable",
      503
    );
  }
  if (typeof execute !== "function") throw new TypeError("DeepSeek execution callback is required");

  const modelId = typeof model === "string" && model.trim() ? model.trim() : "deepseek-chat";
  const deepseek = createOpenAICompatible({
    name: "deepseek",
    apiKey: normalizedApiKey,
    baseURL: normalizeDeepSeekBaseUrl(baseUrl),
    fetch: createBoundedProviderFetch(fetchImpl),
    supportsStructuredOutputs: true,
    transformRequestBody: (body) => ({
      ...body,
      response_format: { type: "json_object" }
    })
  });
  const controller = new AbortController();
  const safeTimeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 20_000;
  let timeout;
  const deadline = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      controller.abort();
      reject(timeoutError());
    }, safeTimeoutMs);
  });

  try {
    return await Promise.race([
      Promise.resolve(execute({
        model: deepseek.chatModel(modelId),
        modelId,
        abortSignal: controller.signal
      })),
      deadline
    ]);
  } finally {
    clearTimeout(timeout);
  }
}

/** Combine the shared DeepSeek transport and the embedded Mastra execution. */
export function runDeepSeekProposal(input, {
  apiKey = process.env.DEEPSEEK_API_KEY,
  baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  fetchImpl = globalThis.fetch,
  model = process.env.DEEPSEEK_MODEL || "deepseek-chat",
  timeoutMs = 20_000,
  capabilityId,
  instructions,
  inputSchema,
  outputSchema,
  normalize,
  modelSettings
} = {}) {
  if (typeof normalize !== "function") {
    throw new TypeError("DeepSeek proposal execution requires a normalizer");
  }
  return withDeepSeekModel({ apiKey, baseUrl, fetchImpl, model, timeoutMs }, ({
    model: languageModel,
    modelId,
    abortSignal
  }) => runStructuredProposal({
    capabilityId,
    model: languageModel,
    instructions,
    inputSchema,
    outputSchema,
    normalize: (value, runtimeInput) => normalize(value, runtimeInput, modelId),
    abortSignal,
    modelSettings,
    input
  }));
}
