/** @fileoverview Browser transport for one confirmed current-domain daily summary. */
import { sanitizeDomainDailySummaryInput, validateDomainDailySummaryResponse } from "./domain-daily-summary-model.mjs";

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
      const controller = new AbortController(); let callerAborted = false; let timedOut = false;
      const abort = () => { callerAborted = true; controller.abort(); };
      if (value.signal?.aborted) abort(); else value.signal?.addEventListener("abort", abort, { once: true });
      if (callerAborted) {
        value.signal?.removeEventListener("abort", abort);
        throw new DomainDailySummaryProviderError("aborted");
      }
      let timeout;
      const deadline = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new DomainDailySummaryProviderError("timeout"));
        }, timeoutMs);
      });
      try {
        const operation = (async () => {
          const response = await fetchImpl(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: controller.signal });
          if (!response?.ok) {
            let serverCode = ""; try { serverCode = String((await response.json())?.error?.code || ""); } catch {}
            throw new DomainDailySummaryProviderError(serverCode === "AI_DOMAIN_DAILY_SUMMARY_UNSAFE" ? "unsafe" : responseFailureCode(response?.status));
          }
          const result = await response.json();
          if (callerAborted || value.signal?.aborted) throw new DomainDailySummaryProviderError("aborted");
          if (timedOut) throw new DomainDailySummaryProviderError("timeout");
          return validateDomainDailySummaryResponse(result, input);
        })();
        return await Promise.race([operation, deadline]);
      } catch (caught) {
        if (callerAborted || value.signal?.aborted) throw new DomainDailySummaryProviderError("aborted");
        if (timedOut) throw new DomainDailySummaryProviderError("timeout");
        if (caught instanceof DomainDailySummaryProviderError) throw caught;
        if (caught?.name === "AbortError") throw new DomainDailySummaryProviderError("offline");
        if (caught?.name === "AiClassifierError" || caught instanceof SyntaxError) throw new DomainDailySummaryProviderError("invalid-response");
        throw new DomainDailySummaryProviderError("offline");
      } finally { clearTimeout(timeout); value.signal?.removeEventListener("abort", abort); }
    }
  };
}
