/**
 * @fileoverview Browser providers for remote daily review and chronological fallback.
 */

import { chronologicalReviewEntries, createLocalDailyReview } from "./model.mjs";
import { postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";

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
        const result = await postRemoteAiJson({
          endpoint,
          input: {
            date,
            locale,
            entries: chronologicalReviewEntries(entries).map((entry) => ({
              id: entry.id,
              time: entry.time || "",
              content: entry.content
            }))
          },
          fetchImpl,
          getAccessToken,
          signal,
          abortFailureCode: "timeout"
        });
        if (!result || !Array.isArray(result.segments) || !Array.isArray(result.analyzedEntryIds)) {
          throw new Error("remote review returned an invalid result");
        }
        return result;
      } catch (error) {
        const fallback = await fallbackProvider.analyze({ date, entries, locale });
        return {
          ...fallback,
          fallbackReason: ["aborted", "timeout"].includes(error?.code) ? "remote-timeout" : "remote-unavailable"
        };
      }
    }
  };
}
