import { postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";
import { buildPlanRecordReviewFacts, buildPlanRecordRelationInput, normalizePlanRecordRelations } from "./model.mjs";

export function createRemotePlanRecordReviewProvider({ endpoint = "/api/organize/plan-record-review", fetchImpl = globalThis.fetch, getAccessToken } = {}) {
  return {
    id: "deepseek-plan-record-review-v1",
    async analyze(input) {
      const facts = buildPlanRecordReviewFacts(input);
      const request = buildPlanRecordRelationInput(facts, { locale: input.locale });
      if (!request.entries.some((entry) => entry.planIds.length)) return facts;
      try {
        const result = await postRemoteAiJson({ endpoint, input: request, fetchImpl, getAccessToken, signal: input.signal });
        return normalizePlanRecordRelations(result, facts, request);
      } catch (error) {
        return { ...facts, fallbackReason: error?.code || "invalid-response" };
      }
    }
  };
}
