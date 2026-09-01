/** Browser-only transport for one transient ordinary-draft improvement proposal. */

import {
  sanitizeContentImprovementInput,
  validateContentImprovementResponse
} from "./content-improvement-model.mjs";

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

      const controller = new AbortController();
      let callerAborted = false;
      let timedOut = false;
      const abortFromCaller = () => {
        callerAborted = true;
        controller.abort();
      };
      value.signal?.addEventListener("abort", abortFromCaller, { once: true });
      const timeout = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 25_000);

      try {
        const response = await fetchImpl(endpoint, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(input),
          cache: "no-store",
          signal: controller.signal
        });
        if (!response?.ok) {
          throw new ContentImprovementProviderError(responseFailureCode(response?.status));
        }
        const payload = await response.json();
        if (callerAborted || value.signal?.aborted) {
          throw new ContentImprovementProviderError("aborted");
        }
        if (timedOut) throw new ContentImprovementProviderError("timeout");
        try {
          return validateContentImprovementResponse(payload, input);
        } catch {
          throw new ContentImprovementProviderError("invalid-response");
        }
      } catch (error) {
        if (callerAborted || value.signal?.aborted) {
          throw new ContentImprovementProviderError("aborted");
        }
        if (timedOut) throw new ContentImprovementProviderError("timeout");
        if (error instanceof ContentImprovementProviderError) throw error;
        throw new ContentImprovementProviderError(error?.name === "AbortError" ? "unavailable" : "offline");
      } finally {
        clearTimeout(timeout);
        value.signal?.removeEventListener("abort", abortFromCaller);
      }
    }
  });
}
