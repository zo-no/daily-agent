/** @fileoverview Browser transport for human-approved today plan clarification. */
import { sanitizeTodayPlanClarificationInput, validateTodayPlanClarificationResponse } from "./model.mjs";
import { RemoteAiRequestError, postRemoteAiJson } from "../../../shared/ai/remote-request.mjs";

export class TodayPlanClarificationProviderError extends Error { constructor(code) { super("today clarification is unavailable"); this.name = "TodayPlanClarificationProviderError"; this.code = code; } }
function responseCode(status) { if (status === 401 || status === 403) return "auth"; if (status === 429) return "rate-limited"; if (status === 503) return "unconfigured"; if (status === 504) return "timeout"; if (status === 502 || status === 422) return "invalid-response"; return "unavailable"; }
export function createRemoteTodayPlanClarificationProvider({ endpoint = "/api/organize/today-plan-clarification", fetchImpl = globalThis.fetch, getAccessToken, timeoutMs = 25_000 } = {}) {
  async function send(value) {
    if (value.signal?.aborted) throw new TodayPlanClarificationProviderError("aborted");
    const minimal = value?.mode === "analyze"
      ? { schemaVersion: value.schemaVersion, mode: value.mode, requestId: value.requestId, targetDate: value.targetDate, sourceFingerprint: value.sourceFingerprint, locale: value.locale, plans: value.plans, entries: value.entries }
      : { schemaVersion: value?.schemaVersion, mode: value?.mode, requestId: value?.requestId, targetDate: value?.targetDate, sourceFingerprint: value?.sourceFingerprint, locale: value?.locale, target: value?.target, questionIndex: value?.questionIndex, answers: value?.answers };
    let input; try { input = sanitizeTodayPlanClarificationInput(minimal); } catch { throw new TodayPlanClarificationProviderError("invalid-input"); }
    try { const payload = await postRemoteAiJson({ endpoint, input, fetchImpl, getAccessToken, signal: value.signal, timeoutMs, mapHttpFailure: ({ status }) => responseCode(status) }); return validateTodayPlanClarificationResponse(payload, input); }
    catch (caught) { if (caught instanceof TodayPlanClarificationProviderError) throw caught; if (caught instanceof RemoteAiRequestError) throw new TodayPlanClarificationProviderError(caught.code); if (caught?.name === "AiClassifierError" || caught instanceof SyntaxError) throw new TodayPlanClarificationProviderError("invalid-response"); throw new TodayPlanClarificationProviderError("offline"); }
  }
  return { id: "deepseek-today-plan-clarification-v1", analyze: send, reply: send };
}
