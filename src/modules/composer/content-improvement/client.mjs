/** Browser-only transport for one transient ordinary-draft improvement proposal. */

import {
  sanitizeContentImprovementInput,
  validateContentImprovementResponse
} from "./model.mjs";
import { RemoteAiRequestError, postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";

export class ContentImprovementProviderError extends Error {
  constructor(code) {
    super("content improvement is unavailable");
    this.name = "ContentImprovementProviderError";
    this.code = code;
  }
}

function minimalPayload(value) {
  return {
    schemaVersion: value?.schemaVersion,
    requestId: value?.requestId,
    target: value?.target,
    sourceFingerprint: value?.sourceFingerprint,
    locale: value?.locale,
    content: value?.content
  };
}

function responseFailureCode(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate-limited";
  if (status === 503) return "unconfigured";
  if (status === 504) return "timeout";
  if (status === 400 || status === 413 || status === 415 || status === 502) return "invalid-response";
  return "unavailable";
}

export function createRemoteContentImprovementProvider({
  endpoint = "/api/records/improve",
  fetchImpl = globalThis.fetch,
  getAccessToken,
  timeoutMs = 25_000
} = {}) {
  return Object.freeze({
    id: "deepseek-content-improvement-v1",
    async improve(value = {}) {
      let input;
      try {
        input = sanitizeContentImprovementInput(minimalPayload(value));
      } catch {
        throw new ContentImprovementProviderError("invalid-input");
      }
      if (value.signal?.aborted) throw new ContentImprovementProviderError("aborted");

      let token;
      try {
        token = typeof getAccessToken === "function" ? await getAccessToken() : "";
      } catch {
        throw new ContentImprovementProviderError("unconfigured");
      }
      if (!token || typeof fetchImpl !== "function") {
        throw new ContentImprovementProviderError("unconfigured");
      }
      if (value.signal?.aborted) throw new ContentImprovementProviderError("aborted");

      try {
        const payload = await postRemoteAiJson({
          endpoint,
          input,
          fetchImpl,
          getAccessToken: async () => token,
          signal: value.signal,
          timeoutMs,
          abortFailureCode: "unavailable",
          mapHttpFailure: ({ status }) => responseFailureCode(status)
        });
        try {
          return validateContentImprovementResponse(payload, input);
        } catch {
          throw new ContentImprovementProviderError("invalid-response");
        }
      } catch (error) {
        if (error instanceof ContentImprovementProviderError) throw error;
        if (error instanceof RemoteAiRequestError) throw new ContentImprovementProviderError(error.code);
        throw new ContentImprovementProviderError(error?.name === "AbortError" ? "unavailable" : "offline");
      }
    }
  });
}
