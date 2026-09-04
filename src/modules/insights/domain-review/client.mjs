/**
 * @fileoverview Browser-only transport for one confirmed seven-day domain summary.
 */

import {
  sanitizeDomainReviewInput,
  validateDomainReviewResponse
} from "./model.mjs";
import { RemoteAiRequestError, postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";

export class DomainReviewProviderError extends Error {
  constructor(code, message = "domain review is unavailable") {
    super(message);
    this.name = "DomainReviewProviderError";
    this.code = code;
  }
}

function minimalPayload(value) {
  return {
    windowStart: value?.windowStart,
    windowEnd: value?.windowEnd,
    domainName: value?.domainName,
    locale: value?.locale,
    entries: (Array.isArray(value?.entries) ? value.entries : []).map((entry) => ({
      id: entry?.id,
      date: entry?.date,
      time: entry?.time ?? "",
      content: entry?.content ?? "",
      sourceType: entry?.sourceType
    }))
  };
}

function responseFailureCode(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate-limited";
  if (status === 503) return "unconfigured";
  if (status === 504) return "timeout";
  if (status === 502) return "invalid-response";
  return "unavailable";
}

/** Creates a strict remote-only provider. It never manufactures a local AI result. */
export function createRemoteDomainReviewProvider({
  endpoint = "/api/organize/domain-review",
  fetchImpl = globalThis.fetch,
  getAccessToken,
  timeoutMs = 25_000
} = {}) {
  return {
    id: "deepseek-domain-review-v1",
    async analyze(value = {}) {
      const callerSignal = value.signal;
      if (callerSignal?.aborted) throw new DomainReviewProviderError("aborted");

      let token;
      try {
        token = typeof getAccessToken === "function" ? await getAccessToken() : "";
      } catch {
        throw new DomainReviewProviderError("unconfigured");
      }
      if (!token || typeof fetchImpl !== "function") throw new DomainReviewProviderError("unconfigured");

      let input;
      try {
        input = sanitizeDomainReviewInput(minimalPayload(value));
      } catch {
        throw new DomainReviewProviderError("invalid-input");
      }

      try {
        const payload = await postRemoteAiJson({
          endpoint,
          input,
          fetchImpl,
          getAccessToken: async () => token,
          signal: callerSignal,
          timeoutMs,
          abortFailureCode: "unavailable",
          mapHttpFailure: ({ status, serverCode }) => (
            serverCode === "AI_DOMAIN_REVIEW_UNSAFE" ? "unsafe" : responseFailureCode(status)
          )
        });
        return validateDomainReviewResponse(payload, input);
      } catch (error) {
        if (error instanceof DomainReviewProviderError) throw error;
        if (error instanceof RemoteAiRequestError) throw new DomainReviewProviderError(error.code);
        if (error?.name === "AbortError") throw new DomainReviewProviderError("unavailable");
        if (error?.name === "AiClassifierError" || error instanceof SyntaxError) {
          throw new DomainReviewProviderError("invalid-response");
        }
        throw new DomainReviewProviderError("offline");
      }
    }
  };
}
