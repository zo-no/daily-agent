/** @fileoverview Browser transport for one human-approved Calendar/diary review. */
import { sanitizeCalendarDiaryReviewInput, validateCalendarDiaryReviewResponse } from "./model.mjs";
import { RemoteAiRequestError, postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";

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
    try {
      const payload = await postRemoteAiJson({
        endpoint,
        input,
        fetchImpl,
        getAccessToken: async () => token,
        signal: value.signal,
        timeoutMs,
        mapHttpFailure: ({ status }) => responseCode(status)
      });
      return validateCalendarDiaryReviewResponse(payload, input);
    } catch (caught) {
      if (caught instanceof CalendarDiaryReviewProviderError) throw caught;
      if (caught instanceof RemoteAiRequestError) throw new CalendarDiaryReviewProviderError(caught.code);
      if (caught?.name === "AiClassifierError" || caught instanceof SyntaxError) throw new CalendarDiaryReviewProviderError("invalid-response");
      if (caught?.name === "AbortError") throw new CalendarDiaryReviewProviderError("offline");
      throw new CalendarDiaryReviewProviderError("offline");
    }
  } };
}
