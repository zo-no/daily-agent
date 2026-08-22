/**
 * @fileoverview Browser providers for remote daily review and chronological fallback.
 */

import { chronologicalReviewEntries, createLocalDailyReview } from "./daily-review-model.mjs";

export function createLocalDailyReviewProvider() {
  return {
    id: "local-timeline-v1",
    async analyze({ entries }) {
      return createLocalDailyReview(entries);
    }
  };
}

export function createRemoteDailyReviewProvider({
  endpoint = "/api/organize/review",
  fallbackProvider = createLocalDailyReviewProvider(),
  fetchImpl = globalThis.fetch,
  getAccessToken
} = {}) {
  return {
    id: "deepseek-daily-review-v1",
    async analyze({ date, entries, locale, signal }) {
      try {
        const token = typeof getAccessToken === "function" ? await getAccessToken() : "";
        if (!token || typeof fetchImpl !== "function") throw new Error("remote review unavailable");
        const controller = new AbortController();
        const abortFromCaller = () => controller.abort();
        if (signal?.aborted) controller.abort();
        else signal?.addEventListener("abort", abortFromCaller, { once: true });
        const timeout = setTimeout(() => controller.abort(), 25_000);
        let response;
        try {
          response = await fetchImpl(endpoint, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              date,
              locale,
              entries: chronologicalReviewEntries(entries).map((entry) => ({
                id: entry.id,
                time: entry.time || "",
                content: entry.content
              }))
            }),
            cache: "no-store",
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeout);
          signal?.removeEventListener("abort", abortFromCaller);
        }
        if (!response.ok) throw new Error(`remote review failed with ${response.status}`);
        const result = await response.json();
        if (!result || !Array.isArray(result.segments) || !Array.isArray(result.analyzedEntryIds)) {
          throw new Error("remote review returned an invalid result");
        }
        return result;
      } catch (error) {
        const fallback = await fallbackProvider.analyze({ date, entries, locale });
        return {
          ...fallback,
          fallbackReason: error?.name === "AbortError" ? "remote-timeout" : "remote-unavailable"
        };
      }
    }
  };
}
