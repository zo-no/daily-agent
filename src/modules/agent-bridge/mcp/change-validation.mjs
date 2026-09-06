import { normalizePlanBlock } from "../../../lib/plan-model.mjs";
import { sanitizeTags } from "../../../lib/data.mjs";
import {
  AGENT_BRIDGE_MAX_CONTENT_CHARS,
  cloneJson,
  isRealDate,
  isValidTime,
  planDraftSchema,
  recordDraftSchema
} from "./schema.mjs";

const PLAN_KEYS = new Set(["date", "startTime", "endTime", "title", "flexibility"]);
const RECORD_KEYS = new Set(["date", "time", "content", "categoryId", "templateId", "fieldValues", "tags"]);

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value;
}

function assertAllowedKeys(value, allowed, label) {
  assertObject(value, label);
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new Error(`${label} contains unsupported fields: ${unknown.join(", ")}`);
}

function stateOrThrow(state) {
  if (!state || !Array.isArray(state.categories) || !Array.isArray(state.templates)) throw new Error("current account state is required");
  return state;
}

export function validatePlanDraft(draft, { operation = "create", state, existing = null } = {}) {
  assertAllowedKeys(draft, PLAN_KEYS, "plan draft");
  const current = stateOrThrow(state);
  if (operation === "delete") {
    if (Object.keys(draft).length) throw new Error("delete plan draft must be empty");
    if (!existing || existing.source === "google") throw new Error("Google plans are read-only");
    return cloneJson(existing);
  }
  if (!["create", "update"].includes(operation)) throw new Error("unsupported plan operation");
  if (operation === "update" && (!existing || existing.source === "google")) throw new Error("only an existing local plan can be updated");

  const candidate = {
    ...(operation === "update" ? existing : {}),
    ...draft,
    id: operation === "update" ? existing.id : "proposal-plan",
    source: operation === "update" ? existing.source : "local",
    externalRef: operation === "update" ? existing.externalRef : null,
    flexibility: Object.prototype.hasOwnProperty.call(draft, "flexibility") ? draft.flexibility : existing?.flexibility || "movable"
  };
  const parsed = planDraftSchema.parse({
    date: candidate.date,
    startTime: candidate.startTime,
    endTime: candidate.endTime,
    title: candidate.title,
    flexibility: candidate.flexibility
  });
  const normalized = normalizePlanBlock({ ...candidate, ...parsed });
  if (normalized.source !== "local") throw new Error("only local plans are writable");
  if (!current.planBlocks && operation === "update") throw new Error("current plan state is invalid");
  return {
    id: normalized.id,
    date: normalized.date,
    startTime: normalized.startTime,
    endTime: normalized.endTime,
    title: normalized.title,
    source: "local",
    flexibility: normalized.flexibility,
    externalRef: operation === "update" ? cloneJson(existing.externalRef || null) : null
  };
}

function validateFieldValues(value) {
  if (value === undefined) return {};
  assertObject(value, "record fieldValues");
  try {
    JSON.stringify(value);
  } catch {
    throw new Error("record fieldValues must be JSON serializable");
  }
  return cloneJson(value);
}

export function validateRecordDraft(draft, { operation = "create", state, existing = null } = {}) {
  assertAllowedKeys(draft, RECORD_KEYS, "record draft");
  const current = stateOrThrow(state);
  if (operation === "delete") {
    if (Object.keys(draft).length) throw new Error("delete record draft must be empty");
    if (!existing) throw new Error("record target does not exist");
    return cloneJson(existing);
  }
  if (!["create", "update"].includes(operation)) throw new Error("unsupported record operation");
  if (operation === "update" && !existing) throw new Error("record target does not exist");
  const categoryIds = new Set(current.categories.map((category) => String(category.id)));
  const templateIds = new Set(current.templates.map((template) => String(template.id)));
  const candidate = { ...(operation === "update" ? existing : {}), ...draft };
  if (!isRealDate(candidate.date)) throw new Error("record date is invalid");
  if (!isValidTime(candidate.time || "", { allowEmpty: true })) throw new Error("record time is invalid");
  if (typeof candidate.content !== "string" || !candidate.content.trim()) throw new Error("record content is required");
  if (Array.from(candidate.content).length > AGENT_BRIDGE_MAX_CONTENT_CHARS) throw new Error("record content is too long");
  if (!categoryIds.has(String(candidate.categoryId))) throw new Error("record category does not exist");
  if (candidate.templateId !== undefined && candidate.templateId !== null && !templateIds.has(String(candidate.templateId))) {
    throw new Error("record template does not exist");
  }
  const fieldValues = validateFieldValues(candidate.fieldValues);
  const tags = sanitizeTags(candidate.tags || []);
  const normalized = recordDraftSchema.parse({
    date: String(candidate.date),
    time: String(candidate.time || ""),
    content: String(candidate.content),
    categoryId: String(candidate.categoryId),
    templateId: candidate.templateId == null ? null : String(candidate.templateId),
    fieldValues,
    tags
  });
  return {
    ...(operation === "update" ? cloneJson(existing) : {}),
    ...normalized,
    attachments: operation === "update" ? cloneJson(existing.attachments || []) : []
  };
}

export function buildChangeDiff(before, after, fields = []) {
  const beforeObject = before && typeof before === "object" ? before : {};
  const afterObject = after && typeof after === "object" ? after : {};
  const keys = fields.length ? fields : [...new Set([...Object.keys(beforeObject), ...Object.keys(afterObject)])];
  const diffBefore = {};
  const diffAfter = {};
  keys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(beforeObject, key)) diffBefore[key] = cloneJson(beforeObject[key]);
    if (Object.prototype.hasOwnProperty.call(afterObject, key)) diffAfter[key] = cloneJson(afterObject[key]);
  });
  return { before: diffBefore, after: diffAfter };
}
