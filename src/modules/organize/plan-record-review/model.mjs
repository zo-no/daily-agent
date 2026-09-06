/**
 * @fileoverview Deterministic local evidence for comparing local plans with
 * ordinary records. The result is session-only and contains no write intent.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const RELATIONS = new Set(["related", "unrelated", "uncertain"]);

function timeToMinutes(value) {
  if (!TIME_PATTERN.test(String(value || ""))) return null;
  const [hour, minute] = String(value).split(":").map(Number);
  return hour * 60 + minute;
}

function bounded(value, max) { return typeof value === "string" ? value.trim().slice(0, max) : ""; }

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
    id: String(entry.id), time: bounded(entry.time, 8), content: bounded(entry.content, 360)
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

export function normalizePlanRecordRelations(value, facts) {
  const allowedEntries = new Map(facts.entries.map((entry) => [entry.id, entry]));
  const relations = Array.isArray(value?.relations) ? value.relations : [];
  const seen = new Set();
  relations.forEach((item) => {
    const entry = allowedEntries.get(String(item?.entryId || ""));
    const relation = RELATIONS.has(item?.relation) ? item.relation : "uncertain";
    if (!entry || seen.has(entry.id)) return;
    seen.add(entry.id);
    entry.relation = relation;
  });
  facts.comparisons.forEach((comparison) => {
    comparison.relations = comparison.entryIds.map((entryId) => ({ entryId, relation: allowedEntries.get(entryId)?.relation || "uncertain" }));
  });
  return facts;
}

export { RELATIONS, timeToMinutes };
