/** @fileoverview Bounded, session-only today plan-to-diary clarification contracts. */
import { AiClassifierError } from "../../../shared/ai/http-boundary.mjs";

export const TODAY_PLAN_CLARIFICATION_SCHEMA_VERSION = "today-plan-clarification-v1";
export const MAX_TODAY_CLARIFICATION_PLANS = 40;
export const MAX_TODAY_CLARIFICATION_ENTRIES = 80;
export const MAX_TODAY_CLARIFICATION_TARGETS = 5;
export const MAX_TODAY_CLARIFICATION_ANSWER_CHARS = 1200;
export const MAX_TODAY_CLARIFICATION_QUESTION_CHARS = 360;

const PLAN_KEYS = ["id", "title", "startMinute", "endMinute"];
const ENTRY_KEYS = ["id", "time", "content"];
const TARGET_KEYS = ["kind", "sourceId", "question", "summary"];
const ANALYZE_KEYS = ["schemaVersion", "mode", "requestId", "targetDate", "sourceFingerprint", "locale", "plans", "entries"];
const REPLY_KEYS = ["schemaVersion", "mode", "requestId", "targetDate", "sourceFingerprint", "locale", "target", "questionIndex", "answers"];
const REPLY_ENTRY_TARGET_KEYS = ["kind", "sourceId", "time", "content"];
const REPLY_PLAN_TARGET_KEYS = ["kind", "sourceId", "title", "startMinute", "endMinute"];
const ANSWER_KEYS = ["question", "answer"];

const inputError = (message) => new AiClassifierError("AI_TODAY_PLAN_CLARIFICATION_INPUT_INVALID", message, 422);
const outputError = (message) => new AiClassifierError("AI_TODAY_PLAN_CLARIFICATION_RESPONSE_INVALID", message, 502);
const chars = (value) => Array.from(String(value ?? ""));
const bounded = (value, limit) => chars(String(value ?? "").trim()).slice(0, limit).join("");
const timePattern = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const idPattern = /^(?:plan|entry)-\d{3}$/;

function assertExactKeys(value, keys, error, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw error(`${label} must be an object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw error(`${label} contains unsupported fields`);
}

function validDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function hash(value) {
  let result = 0x811c9dc5;
  for (const character of String(value)) { result ^= character.codePointAt(0); result = Math.imul(result, 0x01000193) >>> 0; }
  return `fnv1a-${result.toString(16).padStart(8, "0")}`;
}

export function todayPlanClarificationLocalDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Projects local data into opaque, strictly bounded transport values. */
export function buildTodayPlanClarificationInput({ plans = [], entries = [] } = {}, { date = todayPlanClarificationLocalDate(), locale = "en" } = {}) {
  if (!validDate(date)) throw inputError("today clarification date is invalid");
  const selectedPlans = (Array.isArray(plans) ? plans : [])
    .filter((plan) => plan?.source === "local" && String(plan.date || "") === date)
    .map((plan, index) => ({ title: bounded(plan.title, 240), startMinute: Number(plan.startMinute), endMinute: Number(plan.endMinute), index }))
    .filter((plan) => plan.title && Number.isInteger(plan.startMinute) && Number.isInteger(plan.endMinute) && plan.startMinute >= 0 && plan.endMinute <= 1440 && plan.endMinute > plan.startMinute)
    .sort((left, right) => left.startMinute - right.startMinute || left.endMinute - right.endMinute || left.title.localeCompare(right.title) || left.index - right.index)
    .slice(0, MAX_TODAY_CLARIFICATION_PLANS)
    .map((plan, index) => ({ id: `plan-${String(index + 1).padStart(3, "0")}`, title: plan.title, startMinute: plan.startMinute, endMinute: plan.endMinute }));
  const selectedEntries = (Array.isArray(entries) ? entries : [])
    .filter((entry) => String(entry?.date || "") === date && typeof entry?.content === "string" && entry.content.trim())
    .map((entry, index) => ({ time: timePattern.test(String(entry.time || "")) ? String(entry.time) : "", content: bounded(entry.content, 4000), createdAt: Number(entry.createdAt) || index, index }))
    .sort((left, right) => left.time.localeCompare(right.time) || left.createdAt - right.createdAt || left.index - right.index)
    .slice(0, MAX_TODAY_CLARIFICATION_ENTRIES)
    .map((entry, index) => ({ id: `entry-${String(index + 1).padStart(3, "0")}`, time: entry.time, content: entry.content }));
  const base = { schemaVersion: TODAY_PLAN_CLARIFICATION_SCHEMA_VERSION, targetDate: date, locale: locale === "zh-CN" ? "zh-CN" : "en", plans: selectedPlans, entries: selectedEntries };
  return { ...base, sourceFingerprint: hash(JSON.stringify(base)) };
}

function sanitizePlan(value) {
  assertExactKeys(value, PLAN_KEYS, inputError, "today plan");
  const id = bounded(value.id, 32); const title = bounded(value.title, 240);
  if (!idPattern.test(id) || !title || !Number.isInteger(value.startMinute) || !Number.isInteger(value.endMinute) || value.startMinute < 0 || value.endMinute > 1440 || value.endMinute <= value.startMinute) throw inputError("today plan is invalid");
  return { id, title, startMinute: value.startMinute, endMinute: value.endMinute };
}

function sanitizeEntry(value) {
  assertExactKeys(value, ENTRY_KEYS, inputError, "today record");
  const id = bounded(value.id, 32); const time = String(value.time || ""); const content = bounded(value.content, 4000);
  if (!idPattern.test(id) || !id.startsWith("entry-") || (time && !timePattern.test(time)) || !content) throw inputError("today record is invalid");
  return { id, time, content };
}

function sanitizeReplyTarget(value) {
  if (value?.kind === "entry") {
    assertExactKeys(value, REPLY_ENTRY_TARGET_KEYS, inputError, "today clarification entry target");
    const source = sanitizeEntry({ id: value.sourceId, time: value.time, content: value.content });
    return { kind: "entry", sourceId: source.id, time: source.time, content: source.content };
  }
  if (value?.kind === "plan") {
    assertExactKeys(value, REPLY_PLAN_TARGET_KEYS, inputError, "today clarification plan target");
    const source = sanitizePlan({ id: value.sourceId, title: value.title, startMinute: value.startMinute, endMinute: value.endMinute });
    if (!source.id.startsWith("plan-")) throw inputError("today clarification plan target is invalid");
    return { kind: "plan", sourceId: source.id, title: source.title, startMinute: source.startMinute, endMinute: source.endMinute };
  }
  throw inputError("today clarification target is invalid");
}

function sanitizeAnswer(value) {
  assertExactKeys(value, ANSWER_KEYS, inputError, "today clarification answer");
  const question = bounded(value.question, MAX_TODAY_CLARIFICATION_QUESTION_CHARS);
  const answer = bounded(value.answer, MAX_TODAY_CLARIFICATION_ANSWER_CHARS);
  if (!question || !answer) throw inputError("today clarification answer is invalid");
  return { question, answer };
}

function sanitizeBase(value, keys) {
  assertExactKeys(value, keys, inputError, "today clarification input");
  const requestId = bounded(value.requestId, 128); const sourceFingerprint = bounded(value.sourceFingerprint, 32);
  if (value.schemaVersion !== TODAY_PLAN_CLARIFICATION_SCHEMA_VERSION || !validDate(value.targetDate) || !["en", "zh-CN"].includes(value.locale) || !requestId || !/^fnv1a-[0-9a-f]{8}$/.test(sourceFingerprint)) throw inputError("today clarification scope is invalid");
  return { schemaVersion: value.schemaVersion, mode: value.mode, requestId, targetDate: value.targetDate, sourceFingerprint, locale: value.locale };
}

export function sanitizeTodayPlanClarificationInput(value) {
  if (value?.mode === "analyze") {
    const base = sanitizeBase(value, ANALYZE_KEYS);
    if (!Array.isArray(value.plans) || !Array.isArray(value.entries) || value.plans.length < 1 || value.plans.length > MAX_TODAY_CLARIFICATION_PLANS || value.entries.length > MAX_TODAY_CLARIFICATION_ENTRIES) throw inputError("today clarification source counts are invalid");
    const ids = new Set();
    const plans = value.plans.map(sanitizePlan); const entries = value.entries.map(sanitizeEntry);
    [...plans, ...entries].forEach((source) => { if (ids.has(source.id)) throw inputError("today clarification source IDs are duplicated"); ids.add(source.id); });
    const expected = buildFingerprint({ ...base, plans, entries });
    if (expected !== base.sourceFingerprint) throw inputError("today clarification source fingerprint mismatch");
    return { ...base, plans, entries };
  }
  if (value?.mode === "reply") {
    const base = sanitizeBase(value, REPLY_KEYS);
    const target = sanitizeReplyTarget(value.target);
    if (!Number.isInteger(value.questionIndex) || value.questionIndex < 1 || value.questionIndex > 2 || !Array.isArray(value.answers) || value.answers.length !== value.questionIndex) throw inputError("today clarification answer history is invalid");
    const answers = value.answers.map(sanitizeAnswer);
    return { ...base, target, questionIndex: value.questionIndex, answers };
  }
  throw inputError("today clarification mode is invalid");
}

function buildFingerprint({ schemaVersion, targetDate, locale, plans, entries }) {
  return hash(JSON.stringify({ schemaVersion, targetDate, locale, plans, entries }));
}

export function normalizeTodayPlanClarificationAnalysis(value, input, generatedAt = Date.now(), providerId = "today-plan-clarification") {
  assertExactKeys(value, ["targets"], outputError, "today clarification analysis");
  if (!Array.isArray(value.targets) || value.targets.length > MAX_TODAY_CLARIFICATION_TARGETS) throw outputError("today clarification target count is invalid");
  const allowedPlans = new Set(input.plans.map((plan) => plan.id)); const allowedEntries = new Set(input.entries.map((entry) => entry.id)); const seen = new Set();
  const targets = value.targets.map((target) => {
    assertExactKeys(target, TARGET_KEYS, outputError, "today clarification target");
    const kind = target.kind; const sourceId = bounded(target.sourceId, 32); const question = bounded(target.question, 360); const summary = bounded(target.summary, 240);
    if (!(["entry", "plan"].includes(kind)) || !question || !summary || seen.has(sourceId) || (kind === "entry" ? !allowedEntries.has(sourceId) : !allowedPlans.has(sourceId))) throw outputError("today clarification target is invalid");
    seen.add(sourceId); return { kind, sourceId, question, summary };
  });
  return { schemaVersion: input.schemaVersion, mode: "analyze", requestId: input.requestId, targetDate: input.targetDate, sourceFingerprint: input.sourceFingerprint, targets, providerId: bounded(providerId, 128), generatedAt: Number(generatedAt) };
}

export function normalizeTodayPlanClarificationReply(value, input, generatedAt = Date.now(), providerId = "today-plan-clarification") {
  assertExactKeys(value, ["outcome", "question", "replacementContent"], outputError, "today clarification reply");
  const outcome = value.outcome; const question = bounded(value.question, 360); const replacementContent = bounded(value.replacementContent, 4000);
  if (!(["question", "candidate", "none"].includes(outcome))) throw outputError("today clarification reply outcome is invalid");
  if ((outcome === "question" && (!question || input.questionIndex !== 1 || replacementContent)) || (outcome === "candidate" && (!replacementContent || question)) || (outcome === "none" && (question || replacementContent))) throw outputError("today clarification reply payload is invalid");
  return { schemaVersion: input.schemaVersion, mode: "reply", requestId: input.requestId, targetDate: input.targetDate, sourceFingerprint: input.sourceFingerprint, target: { kind: input.target.kind, sourceId: input.target.sourceId }, questionIndex: input.questionIndex, outcome, question, replacementContent, providerId: bounded(providerId, 128), generatedAt: Number(generatedAt) };
}

export function validateTodayPlanClarificationResponse(value, input) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== input.schemaVersion || value.requestId !== input.requestId || value.targetDate !== input.targetDate || value.sourceFingerprint !== input.sourceFingerprint || value.mode !== input.mode) throw outputError("today clarification response is stale");
  if (input.mode === "analyze") return normalizeTodayPlanClarificationAnalysis({ targets: value.targets }, input, value.generatedAt, value.providerId);
  if (value.target?.kind !== input.target.kind || value.target?.sourceId !== input.target.sourceId || value.questionIndex !== input.questionIndex) throw outputError("today clarification reply target is stale");
  return normalizeTodayPlanClarificationReply({ outcome: value.outcome, question: value.question, replacementContent: value.replacementContent }, input, value.generatedAt, value.providerId);
}

export { validDate };
