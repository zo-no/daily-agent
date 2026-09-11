import { z } from "zod";
import {
  AGENT_BRIDGE_MAX_PLANS,
  AGENT_BRIDGE_MAX_RECORDS,
  dateDistanceInclusive,
  isRealDate,
  stableFingerprint
} from "../../shared/agent-bridge/protocol.mjs";
import { createPlansSnapshot, createRecordsSnapshot } from "./mcp/read-snapshot.mjs";
import { timeToMinutes } from "../../lib/plan-model.mjs";

export const READ_ONLY_QUERY_MAX_RESULTS = 20;

const dateSchema = z.string().refine(isRealDate, "date must be a real YYYY-MM-DD date");
const optionalDateSchema = dateSchema.optional();
const resultLimitSchema = z.number().int().min(1).max(READ_ONLY_QUERY_MAX_RESULTS).default(10);

export const searchRecordsInputSchema = z.object({
  query: z.string().trim().min(1).max(240),
  from: optionalDateSchema,
  to: optionalDateSchema,
  categoryId: z.string().trim().min(1).max(180).optional(),
  tag: z.string().trim().min(1).max(120).optional(),
  limit: resultLimitSchema
}).strict().superRefine((value, context) => {
  if ((value.from && !value.to) || (!value.from && value.to)) {
    context.addIssue({ code: "custom", path: [value.from ? "to" : "from"], message: "from and to must be provided together" });
  }
  if (value.from && value.to && dateDistanceInclusive(value.from, value.to) === null) {
    context.addIssue({ code: "custom", path: ["to"], message: "to must be on or after from" });
  }
});

export const listPlansInputSchema = z.object({
  date: dateSchema,
  limit: resultLimitSchema
}).strict();

export const findPlanConflictsInputSchema = z.object({
  date: dateSchema,
  limit: resultLimitSchema
}).strict();

const recordSchema = z.object({
  id: z.string(), date: z.string(), time: z.string(), content: z.string(), categoryId: z.string(),
  categoryName: z.string().nullable(), templateId: z.string().nullable(), fieldValues: z.record(z.string(), z.unknown()), tags: z.array(z.string())
}).strict();
const planSchema = z.object({
  id: z.string(), date: z.string(), startTime: z.string(), endTime: z.string(), title: z.string(),
  source: z.enum(["local", "google"]), flexibility: z.enum(["fixed", "movable", "resizable"]),
  externalRef: z.record(z.string(), z.unknown()).nullable(), readOnly: z.boolean()
}).strict();
const snapshotMetaSchema = z.object({ schemaVersion: z.number(), revision: z.number(), offline: z.boolean(), updatedAt: z.string(), fingerprint: z.string(), truncated: z.boolean() }).strict();

export const searchRecordsOutputSchema = snapshotMetaSchema.extend({
  query: z.string(), data: z.array(recordSchema), matched: z.number()
}).strict();
export const listPlansOutputSchema = snapshotMetaSchema.extend({ data: z.array(planSchema) }).strict();
export const findPlanConflictsOutputSchema = snapshotMetaSchema.extend({
  date: z.string(), data: z.array(z.object({
    kind: z.enum(["overlap", "ambiguous-title"]),
    planIds: z.array(z.string()),
    message: z.string()
  }).strict())
}).strict();

function metadata(snapshot) {
  return {
    schemaVersion: snapshot.schemaVersion,
    revision: snapshot.revision,
    offline: snapshot.offline,
    updatedAt: snapshot.updatedAt,
    fingerprint: snapshot.fingerprint,
    truncated: snapshot.truncated
  };
}

function contextAdapter(context) {
  const adapter = context?.requestContext?.get?.("logNoteReadOnlyAdapter") || context?.logNoteReadOnlyAdapter;
  if (!adapter || typeof adapter.getState !== "function") throw new Error("read-only Log Note adapter is unavailable");
  return adapter;
}

function rangeForInput(input) {
  if (input.from) return { from: input.from, to: input.to };
  const today = new Date().toISOString().slice(0, 10);
  return { from: today, to: today };
}

function snapshotRecords(adapter, range) {
  if (!adapter || typeof adapter.getState !== "function") throw new Error("read-only Log Note adapter is unavailable");
  return createRecordsSnapshot({
    state: adapter.getState(),
    from: range.from,
    to: range.to,
    revision: adapter.getRevision?.() ?? 0,
    updatedAt: adapter.getUpdatedAt?.(),
    offline: adapter.isOffline?.() ?? false
  });
}

function snapshotPlans(adapter, date) {
  if (!adapter || typeof adapter.getState !== "function") throw new Error("read-only Log Note adapter is unavailable");
  return createPlansSnapshot({
    state: adapter.getState(),
    date,
    revision: adapter.getRevision?.() ?? 0,
    updatedAt: adapter.getUpdatedAt?.(),
    offline: adapter.isOffline?.() ?? false
  });
}

export function searchRecords(input, adapter) {
  const parsed = searchRecordsInputSchema.parse(input);
  const snapshot = snapshotRecords(adapter, rangeForInput(parsed));
  const query = parsed.query.toLocaleLowerCase();
  const data = snapshot.data.filter((record) => {
    const haystack = [record.content, record.categoryName, record.categoryId, ...record.tags].filter(Boolean).join(" ").toLocaleLowerCase();
    return haystack.includes(query)
      && (!parsed.categoryId || record.categoryId === parsed.categoryId)
      && (!parsed.tag || record.tags.includes(parsed.tag));
  });
  return searchRecordsOutputSchema.parse({ ...metadata(snapshot), query: parsed.query, matched: data.length, data: data.slice(0, parsed.limit) });
}

export function listPlans(input, adapter) {
  const parsed = listPlansInputSchema.parse(input);
  const snapshot = snapshotPlans(adapter, parsed.date);
  return listPlansOutputSchema.parse({ ...metadata(snapshot), data: snapshot.data.slice(0, parsed.limit) });
}

export function findPlanConflicts(input, adapter) {
  const parsed = findPlanConflictsInputSchema.parse(input);
  const snapshot = snapshotPlans(adapter, parsed.date);
  const conflicts = [];
  for (let index = 0; index < snapshot.data.length; index += 1) {
    const left = snapshot.data[index];
    const leftEnd = timeToMinutes(left.endTime);
    for (let next = index + 1; next < snapshot.data.length; next += 1) {
      const right = snapshot.data[next];
      if (timeToMinutes(right.startTime) >= leftEnd) break;
      conflicts.push({ kind: "overlap", planIds: [left.id, right.id], message: `计划“${left.title}”与“${right.title}”时间重叠` });
    }
    if (left.title.length < 3) conflicts.push({ kind: "ambiguous-title", planIds: [left.id], message: `计划“${left.title}”标题过短，可能难以执行` });
  }
  const data = conflicts.slice(0, parsed.limit);
  return findPlanConflictsOutputSchema.parse({ ...metadata(snapshot), date: parsed.date, data, fingerprint: stableFingerprint({ base: snapshot.fingerprint, data }) });
}

export function createReadOnlyAdapter({ getState, getRevision, getUpdatedAt, isOffline } = {}) {
  if (typeof getState !== "function") throw new TypeError("read-only adapter requires getState");
  return Object.freeze({ getState, getRevision, getUpdatedAt, isOffline });
}
