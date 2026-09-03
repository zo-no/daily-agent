/** @fileoverview Browser transport for one human-approved Calendar/diary review. */
import { sanitizeCalendarDiaryReviewInput, validateCalendarDiaryReviewResponse } from "./daily-calendar-review-model.mjs";

export class CalendarDiaryReviewProviderError extends Error {
  constructor(code, message = "calendar diary review is unavailable") { super(message); this.name = "CalendarDiaryReviewProviderError"; this.code = code; }
}
function responseCode(status) { if (status === 401 || status === 403) return "auth"; if (status === 429) return "rate-limited"; if (status === 503) return "unconfigured"; if (status === 504) return "timeout"; if (status === 502) return "invalid-response"; return "unavailable"; }

export function createRemoteCalendarDiaryReviewProvider({ endpoint = "/api/organize/day-review", fetchImpl = globalThis.fetch, getAccessToken, timeoutMs = 25_000 } = {}) {
  return { id: "deepseek-calendar-diary-review-v1", async analyze(value = {}) {
    if (value.signal?.aborted) throw new CalendarDiaryReviewProviderError("aborted");
    let token = ""; try { token = typeof getAccessToken === "function" ? await getAccessToken() : ""; } catch { throw new CalendarDiaryReviewProviderError("unconfigured"); }
    if (!token || typeof fetchImpl !== "function") throw new CalendarDiaryReviewProviderError("unconfigured");
    let input; try { input = sanitizeCalendarDiaryReviewInput({ schemaVersion: value.schemaVersion, requestId: value.requestId, targetDate: value.targetDate, sourceFingerprint: value.sourceFingerprint, locale: value.locale, events: value.events, entries: value.entries }); } catch { throw new CalendarDiaryReviewProviderError("invalid-input"); }
    const controller = new AbortController(); let callerAborted = false; let timedOut = false;
    const abort = () => { callerAborted = true; controller.abort(); };
    if (value.signal?.aborted) abort(); else value.signal?.addEventListener("abort", abort, { once: true });
    let timeout;
    const deadline = new Promise((_, reject) => { timeout = setTimeout(() => { timedOut = true; controller.abort(); reject(new CalendarDiaryReviewProviderError("timeout")); }, timeoutMs); });
    try {
      const operation = (async () => {
        const response = await fetchImpl(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(input), cache: "no-store", signal: controller.signal });
        if (!response?.ok) throw new CalendarDiaryReviewProviderError(responseCode(response?.status));
        const result = await response.json();
        if (callerAborted || value.signal?.aborted) throw new CalendarDiaryReviewProviderError("aborted");
        if (timedOut) throw new CalendarDiaryReviewProviderError("timeout");
        return validateCalendarDiaryReviewResponse(result, input);
      })();
      return await Promise.race([operation, deadline]);
    } catch (caught) {
      if (callerAborted || value.signal?.aborted) throw new CalendarDiaryReviewProviderError("aborted");
      if (timedOut) throw new CalendarDiaryReviewProviderError("timeout");
      if (caught instanceof CalendarDiaryReviewProviderError) throw caught;
      if (caught?.name === "AiClassifierError" || caught instanceof SyntaxError) throw new CalendarDiaryReviewProviderError("invalid-response");
      if (caught?.name === "AbortError") throw new CalendarDiaryReviewProviderError("offline");
      throw new CalendarDiaryReviewProviderError("offline");
    } finally { clearTimeout(timeout); value.signal?.removeEventListener("abort", abort); }
  } };
}
