/**
 * @fileoverview Shared bounded HTTP primitives for optional AI routes.
 *
 * This module deliberately has no model-provider or Agent Runtime dependency,
 * so pure browser-safe business models can reuse string/limit contracts.
 */

export const MAX_AI_BODY_BYTES = 256 * 1024;
export const MAX_AI_ENTRIES = 80;
export const MAX_AI_EXAMPLES = 24;
export const MAX_AI_CATEGORIES = 64;
export const MAX_AI_CONTENT_CHARS = 4000;
export const AI_TIMEOUT_MS = 20_000;

const encoder = new TextEncoder();
const BASE_HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff"
};

export class AiClassifierError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "AiClassifierError";
    this.code = code;
    this.status = status;
  }
}

export function jsonResponse(body, status = 200, extraHeaders = {}) {
  const bytes = encoder.encode(JSON.stringify(body));
  return new Response(bytes, {
    status,
    headers: {
      ...BASE_HEADERS,
      "Content-Type": "application/json; charset=utf-8",
      "Content-Length": String(bytes.byteLength),
      ...extraHeaders
    }
  });
}

export function errorResponse(error) {
  const known = error instanceof AiClassifierError;
  return jsonResponse({
    error: {
      code: known ? error.code : "AI_INTERNAL_ERROR",
      message: known ? error.message : "smart organize failed"
    }
  }, known ? error.status : 500);
}

export function hasAllowedOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originUrl = new URL(origin);
    const requestUrl = new URL(request.url);
    if (originUrl.origin === requestUrl.origin) return true;
    const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
    const requestHost = forwardedHost || request.headers.get("host")?.trim();
    const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const requestProtocol = forwardedProtocol || requestUrl.protocol.replace(/:$/, "");
    return Boolean(requestHost)
      && originUrl.host === requestHost
      && originUrl.protocol === `${requestProtocol}:`;
  } catch {
    return false;
  }
}

export function hasJsonContentType(request) {
  return /^application\/json(?:\s*;|$)/i.test(request.headers.get("content-type") || "");
}

export function bearerToken(request) {
  const authorization = request.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+([^\s]+)$/i);
  return match?.[1] || "";
}

export async function readJsonBody(request) {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_AI_BODY_BYTES) {
    throw new AiClassifierError("AI_BODY_TOO_LARGE", "request body exceeds 256 KiB", 413);
  }
  if (!request.body) {
    throw new AiClassifierError(
      "AI_JSON_INVALID",
      "request body must contain valid UTF-8 JSON",
      400
    );
  }

  const reader = request.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_AI_BODY_BYTES) {
        await reader.cancel("AI request body too large").catch(() => undefined);
        throw new AiClassifierError("AI_BODY_TOO_LARGE", "request body exceeds 256 KiB", 413);
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return JSON.parse(text);
  } catch (error) {
    if (error instanceof AiClassifierError) throw error;
    throw new AiClassifierError(
      "AI_JSON_INVALID",
      "request body must contain valid UTF-8 JSON",
      400
    );
  } finally {
    reader.releaseLock();
  }
}

export function boundedString(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
