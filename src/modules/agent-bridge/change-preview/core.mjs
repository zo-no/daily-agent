import { validatePlanDraft, validateRecordDraft } from "../mcp/change-validation.mjs";
import { cloneJson, stableFingerprint } from "../mcp/schema.mjs";
import {
  CHANGE_PREVIEW_SCHEMA_VERSION,
  changePreviewOutputSchema,
  planPreviewInputSchema,
  recordPreviewInputSchema
} from "./contract.mjs";

function abortIfNeeded(abortSignal) {
  if (abortSignal?.aborted) throw new DOMException("Change preview execution was aborted", "AbortError");
}

function prepare(kind, rawInput, { abortSignal } = {}) {
  abortIfNeeded(abortSignal);
  const input = (kind === "plan" ? planPreviewInputSchema : recordPreviewInputSchema).parse(rawInput);
  const validate = kind === "plan" ? validatePlanDraft : validateRecordDraft;
  const candidate = validate(input.draft, {
    operation: input.operation,
    state: input.state,
    existing: input.existing
  });
  abortIfNeeded(abortSignal);
  const before = input.operation === "create" ? null : cloneJson(input.existing);
  const after = input.operation === "delete" ? null : cloneJson(candidate);
  const result = {
    schemaVersion: CHANGE_PREVIEW_SCHEMA_VERSION,
    kind,
    operation: input.operation,
    candidate: cloneJson(candidate),
    before,
    after,
    sourceFingerprint: stableFingerprint({ kind, operation: input.operation, state: input.state, draft: input.draft, existing: input.existing }),
    writePolicy: "preview-required"
  };
  return changePreviewOutputSchema.parse(result);
}

export function preparePlanPreview(input, options) {
  return prepare("plan", input, options);
}

export function prepareRecordPreview(input, options) {
  return prepare("record", input, options);
}
