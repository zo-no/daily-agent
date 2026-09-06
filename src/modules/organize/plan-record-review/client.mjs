import { postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";
import { buildPlanRecordReviewFacts } from "./model.mjs";

export function createLocalPlanRecordReviewProvider() {
  return { id: "local-plan-record-review-v1", async analyze(input) { return buildPlanRecordReviewFacts(input); } };
}

export function createRemotePlanRecordReviewProvider({ endpoint = "/api/organize/plan-record-review", fallbackProvider = createLocalPlanRecordReviewProvider(), fetchImpl = globalThis.fetch, getAccessToken } = {}) {
  return {
    id: "deepseek-plan-record-review-v1",
    async analyze(input) {
      const facts = buildPlanRecordReviewFacts(input);
      if (!facts.entries.length && !facts.plans.length) return facts;
      try {
        const result = await postRemoteAiJson({ endpoint, input: { date: input.date, locale: input.locale, plans: facts.plans, entries: facts.entries.map(({ id, content }) => ({ id, content })) }, fetchImpl, getAccessToken });
        return result && result.schemaVersion === facts.schemaVersion ? result : facts;
      } catch (error) {
        const fallback = await fallbackProvider.analyze(input);
        return { ...fallback, fallbackReason: ["aborted", "timeout"].includes(error?.code) ? "remote-timeout" : "remote-unavailable" };
      }
    }
  };
}
