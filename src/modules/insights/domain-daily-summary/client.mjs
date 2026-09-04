/** @fileoverview Browser transport for one confirmed current-domain daily summary. */
import { sanitizeDomainDailySummaryInput, validateDomainDailySummaryResponse } from "./model.mjs";
import { RemoteAiRequestError, postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";

export class DomainDailySummaryProviderError extends Error {
  constructor(code, message = "daily domain summary is unavailable") { super(message); this.name = "DomainDailySummaryProviderError"; this.code = code; }
}

function responseFailureCode(status) {
  if (status === 401 || status === 403) return "auth";
  if (status === 429) return "rate-limited";
  if (status === 503) return "unconfigured";
  if (status === 504) return "timeout";
  if (status === 502) return "invalid-response";
  return "unavailable";
}

export function createRemoteDomainDailySummaryProvider({ endpoint = "/api/organize/domain-daily-summary", fetchImpl = globalThis.fetch, getAccessToken, timeoutMs = 25_000 } = {}) {
  return {
    id: "deepseek-domain-daily-summary-v1",
    async analyze(value = {}) {
      if (value.signal?.aborted) throw new DomainDailySummaryProviderError("aborted");
      let token = "";
      try { token = typeof getAccessToken === "function" ? await getAccessToken() : ""; } catch { throw new DomainDailySummaryProviderError("unconfigured"); }
      if (!token || typeof fetchImpl !== "function") throw new DomainDailySummaryProviderError("unconfigured");
      let input;
      try { input = sanitizeDomainDailySummaryInput({ domainName: value.domainName, date: value.date, locale: value.locale, entries: value.entries }); } catch { throw new DomainDailySummaryProviderError("invalid-input"); }
      try {
        const payload = await postRemoteAiJson({
          endpoint,
          input,
          fetchImpl,
          getAccessToken: async () => token,
          signal: value.signal,
          timeoutMs,
          mapHttpFailure: ({ status, serverCode }) => (
            serverCode === "AI_DOMAIN_DAILY_SUMMARY_UNSAFE" ? "unsafe" : responseFailureCode(status)
          )
        });
        return validateDomainDailySummaryResponse(payload, input);
      } catch (caught) {
        if (caught instanceof DomainDailySummaryProviderError) throw caught;
        if (caught instanceof RemoteAiRequestError) throw new DomainDailySummaryProviderError(caught.code);
        if (caught?.name === "AbortError") throw new DomainDailySummaryProviderError("offline");
        if (caught?.name === "AiClassifierError" || caught instanceof SyntaxError) throw new DomainDailySummaryProviderError("invalid-response");
        throw new DomainDailySummaryProviderError("offline");
      }
    }
  };
}
