/**
 * @fileoverview Deterministic local evidence for comparing local plans with
 * ordinary records. The result is session-only and contains no write intent.
 */

import { z } from "zod";
import { stableFingerprint } from "../../../shared/agent-bridge/protocol.mjs";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const RELATIONS = new Set(["related", "unrelated", "uncertain"]);
const RELATION_VERSION = "plan-record-relations-v1";
const planIdSchema = z.string().regex(/^plan-\d{3}$/);
const entryIdSchema = z.string().regex(/^entry-\d{3}$/);
const timeSchema = z.string().regex(TIME_PATTERN);

export const planRecordModelOutputSchema = z.object({
  relations: z.array(z.object({ entryId: entryIdSchema, relation: z.enum([...RELATIONS]) }).strict()).max(200)
}).strict();

export const planRecordInputSchema = z.object({
  schemaVersion: z.literal(RELATION_VERSION),
  requestId: z.string().min(1).max(128),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }),
  locale: z.enum(["zh-CN", "en"]),
  sourceFingerprint: z.string().regex(/^fnv1a-[0-9a-f]{8}$/),
  plans: z.array(z.object({
    id: planIdSchema, title: z.string().min(1).max(240),
    startTime: timeSchema, endTime: timeSchema
  }).strict().refine((plan) => timeToMinutes(plan.endTime) > timeToMinutes(plan.startTime))).max(100),
  entries: z.array(z.object({
    id: entryIdSchema, time: z.union([timeSchema, z.literal("")]), content: z.string().min(1).max(360),
    planIds: z.array(planIdSchema).max(100)
  }).strict()).max(200)
}).strict().superRefine((input, context) => {
  const { requestId, sourceFingerprint, ...source } = input;
  const planIds = new Set(input.plans.map((plan) => plan.id));
  const entryIds = new Set(input.entries.map((entry) => entry.id));
  if (planIds.size !== input.plans.length || entryIds.size !== input.entries.length ||
      input.entries.some((entry) => new Set(entry.planIds).size !== entry.planIds.length || entry.planIds.some((id) => !planIds.has(id))) ||
      stableFingerprint(source) !== sourceFingerprint) {
    context.addIssue({ code: "custom", message: "plan review sources or fingerprint are invalid" });
  }
});

const relationResponseSchema = planRecordModelOutputSchema.extend({
  schemaVersion: z.literal(RELATION_VERSION), requestId: z.string().min(1).max(128),
  date: z.string(), sourceFingerprint: z.string()
}).strict();

function timeToMinutes(value) {
  if (!TIME_PATTERN.test(String(value || ""))) return null;
  const [hour, minute, second = 0] = String(value).split(":").map(Number);
  return hour * 60 + minute + second / 60;
}

function bounded(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }
function entrySourceId(index) { return `entry-${String(index + 1).padStart(3, "0")}`; }

function isOrdinaryEntry(entry, templates) {
  const template = templates.find((item) => item.id === entry.templateId);
  return template?.recordType !== "periodic";
}

function overlap(plan, entryTime) {
  const minute = timeToMinutes(entryTime);
  const start = timeToMinutes(plan.startTime);
  const end = timeToMinutes(plan.endTime);
  return minute !== null && start !== null && end !== null && minute >= start && minute < end;
}

export function buildPlanRecordReviewFacts({ date, plans = [], entries = [], templates = [] }) {
  const localPlans = plans.filter((plan) => plan?.source !== "google" && plan?.date === date).map((plan) => ({
    id: String(plan.id), title: bounded(plan.title, 240), startTime: plan.startTime, endTime: plan.endTime, goalId: plan.goalId || null
  }));
  const ordinaryEntries = entries.filter((entry) => entry?.date === date && isOrdinaryEntry(entry, templates)).map((entry) => ({
    id: String(entry.id), time: bounded(entry.time, 8), content: entry.content
  }));
  const entryEvidence = ordinaryEntries.map((entry) => {
    const planIds = localPlans.filter((plan) => overlap(plan, entry.time)).map((plan) => plan.id);
    return { ...entry, evidence: planIds.length ? "inside" : "outside", planIds, relation: "uncertain" };
  });
  const planComparisons = localPlans.map((plan) => {
    const matched = entryEvidence.filter((entry) => entry.planIds.includes(plan.id));
    return { planId: plan.id, entryIds: matched.map((entry) => entry.id), evidence: matched.length ? "inside" : "missing", relations: [] };
  });
  const insideCount = entryEvidence.filter((entry) => entry.evidence === "inside").length;
  const coveredCount = planComparisons.filter((item) => item.evidence === "inside").length;
  return {
    schemaVersion: "plan-record-review-v1",
    date,
    plans: localPlans,
    entries: entryEvidence,
    comparisons: planComparisons,
    metrics: {
      planCount: localPlans.length,
      recordCount: ordinaryEntries.length,
      coveredPlanCount: coveredCount,
      missingPlanCount: localPlans.length - coveredCount,
      insideRecordCount: insideCount,
      outsideRecordCount: ordinaryEntries.length - insideCount,
      planCoverageRatio: localPlans.length ? coveredCount / localPlans.length : null,
      inPlanRecordRatio: ordinaryEntries.length ? insideCount / ordinaryEntries.length : null
    },
    generatedAt: Date.now()
  };
}

/** The transport contains only the disclosed text and request-local source IDs. */
export function buildPlanRecordRelationInput(facts, { locale = "en", requestId = globalThis.crypto.randomUUID() } = {}) {
  const planIds = new Map(facts.plans.slice(0, 100).map((plan, index) => [plan.id, `plan-${String(index + 1).padStart(3, "0")}`]));
  const source = {
    schemaVersion: RELATION_VERSION, date: facts.date, locale,
    plans: facts.plans.slice(0, 100).map((plan) => ({
      id: planIds.get(plan.id), title: plan.title, startTime: plan.startTime, endTime: plan.endTime
    })),
    entries: facts.entries.slice(0, 200).map((entry, index) => ({
      id: entrySourceId(index), time: entry.time,
      content: bounded(entry.content, 360), planIds: entry.planIds.filter((id) => planIds.has(id)).map((id) => planIds.get(id))
    })).filter((entry) => entry.planIds.length)
  };
  return { ...source, requestId, sourceFingerprint: stableFingerprint(source) };
}

export function validatePlanRecordRelations(value, input) {
  const output = planRecordModelOutputSchema.parse(value);
  const allowed = new Map(input.entries.map((entry) => [entry.id, entry]));
  const seen = new Set();
  for (const item of output.relations) {
    const entry = allowed.get(item.entryId);
    if (!entry || seen.has(entry.id) || (!entry.planIds.length && item.relation !== "uncertain")) {
      throw new Error("plan review relation has an invalid source");
    }
    seen.add(entry.id);
  }
  return output;
}

/** Remote output can annotate relations, never replace locally computed evidence. */
export function normalizePlanRecordRelations(value, facts, input) {
  const response = relationResponseSchema.parse(value);
  for (const key of ["schemaVersion", "requestId", "date", "sourceFingerprint"]) {
    if (response[key] !== input[key]) throw new Error("plan review response is stale");
  }
  const { relations } = validatePlanRecordRelations({ relations: response.relations }, input);
  const byOpaqueId = new Map(relations.map((item) => [item.entryId, item.relation]));
  const entries = facts.entries.map((entry, index) => ({ ...entry, relation: byOpaqueId.get(entrySourceId(index)) || "uncertain" }));
  const byLocalId = new Map(entries.map((entry) => [entry.id, entry.relation]));
  return { ...facts, entries, comparisons: facts.comparisons.map((comparison) => ({
    ...comparison, relations: comparison.entryIds.map((entryId) => ({ entryId, relation: byLocalId.get(entryId) }))
  })) };
}

export { RELATIONS, timeToMinutes };
