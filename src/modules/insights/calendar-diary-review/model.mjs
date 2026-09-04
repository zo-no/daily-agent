/** @fileoverview Today-only, read-only Google Calendar and diary review contracts. */
import { AiClassifierError } from "../../../shared/ai/http-boundary.mjs";

export const CALENDAR_DIARY_SCHEMA_VERSION = "calendar-diary-review-v1";
export const MAX_CALENDAR_REVIEW_EVENTS = 40;
export const MAX_CALENDAR_REVIEW_ENTRIES = 80;
export const MAX_CALENDAR_REVIEW_SUGGESTIONS = 12;
export const CALENDAR_REVIEW_KINDS = Object.freeze(["calendar-unrecorded", "record-outside-calendar", "calendar-overlap"]);

const REQUEST_KEYS = Object.freeze(["schemaVersion", "requestId", "targetDate", "sourceFingerprint", "locale", "events", "entries"]);
const EVENT_KEYS = Object.freeze(["id", "title", "startMinute", "endMinute", "allDay"]);
const ENTRY_KEYS = Object.freeze(["id", "time", "content"]);
const OUTPUT_KEYS = Object.freeze(["overview", "suggestions"]);
const SUGGESTION_KEYS = Object.freeze(["kind", "title", "summary", "sourceIds"]);
const RESPONSE_KEYS = Object.freeze(["schemaVersion", "requestId", "targetDate", "sourceFingerprint", "overview", "suggestions", "providerId", "generatedAt"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;

const invalidInput = (message) => new AiClassifierError("AI_CALENDAR_DIARY_REVIEW_INPUT_INVALID", message, 422);
const invalidResponse = (message) => new AiClassifierError("AI_CALENDAR_DIARY_REVIEW_RESPONSE_INVALID", message, 502);
const chars = (value) => Array.from(String(value ?? ""));
const bounded = (value, max, trim = true) => chars(trim ? String(value ?? "").trim() : String(value ?? "")).slice(0, max).join("");
const validTime = (value) => TIME_PATTERN.test(String(value || ""));
const toMinutes = (value) => validTime(value) ? Number(String(value).slice(0, 2)) * 60 + Number(String(value).slice(3, 5)) : null;
const displayTime = (value) => Number.isInteger(value) && value >= 0 && value < 1440 ? `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}` : "";
function validDate(value) { const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "")); if (!match) return false; const [year, month, day] = match.slice(1).map(Number); return month >= 1 && month <= 12 && day >= 1 && day <= new Date(Date.UTC(year, month, 0)).getUTCDate(); }
function assertKeys(value, allowed, makeError, label) { if (!value || typeof value !== "object" || Array.isArray(value)) throw makeError(`${label} must be an object`); const actual = Object.keys(value); const allow = new Set(allowed); if (actual.length !== allowed.length || actual.some((key) => !allow.has(key))) throw makeError(`${label} contains unsupported fields`); }
const normalizeText = (value) => String(value || "").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "").trim();
function terms(value) { const text = normalizeText(value); const latin = text.match(/[a-z0-9]{2,}/g) || []; const cjk = Array.from(text).filter((character) => /[\u3400-\u9fff]/u.test(character)); const bigrams = []; for (let index = 0; index < cjk.length - 1; index += 1) bigrams.push(`${cjk[index]}${cjk[index + 1]}`); return [...new Set([...latin, ...bigrams])]; }
function matchScore(event, entry) { const title = normalizeText(event.title); const content = normalizeText(entry.content); if (!title || !content) return 0; if (content.includes(title) || (title.includes(content) && content.length >= 2)) return 1; const sourceTerms = terms(event.title); const targetTerms = new Set(terms(entry.content)); return sourceTerms.filter((term) => targetTerms.has(term)).length / Math.max(1, sourceTerms.length); }
const overlaps = (left, right) => !left.allDay && !right.allDay && left.startMinute < right.endMinute && right.startMinute < left.endMinute;
function hashFingerprint(value) { let hash = 0x811c9dc5; for (const character of String(value)) { hash ^= character.codePointAt(0); hash = Math.imul(hash, 0x01000193) >>> 0; } return `fnv1a-${hash.toString(16).padStart(8, "0")}`; }

export function todayLocalDate(now = new Date()) { return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`; }

/** Project current account sources to bounded transport-safe values and opaque IDs. */
export function buildCalendarDiaryReviewInput({ timedEvents = [], allDayEvents = [], entries = [] } = {}, { date = todayLocalDate(), locale = "en" } = {}) {
  if (!validDate(date)) throw invalidInput("calendar diary review date is invalid");
  const timed = Array.isArray(timedEvents) ? timedEvents : [];
  const allDay = Array.isArray(allDayEvents) ? allDayEvents : [];
  const rawEvents = [...timed.map((event, index) => ({ event, index, allDay: false })), ...allDay.map((event, index) => ({ event, index: timed.length + index, allDay: true }))].filter(({ event }) => String(event?.date || "") === date);
  const candidates = rawEvents.map(({ event, index, allDay: sourceAllDay }) => {
    const title = bounded(event?.title, 240);
    if (!title) return null;
    if (sourceAllDay || event?.allDay === true) return { title, allDay: true, startMinute: null, endMinute: null, _index: index };
    const startMinute = toMinutes(event?.startTime); const endMinute = toMinutes(event?.endTime);
    if (!Number.isInteger(startMinute) || !Number.isInteger(endMinute) || endMinute <= startMinute) return null;
    return { title, allDay: false, startMinute, endMinute, _index: index };
  }).filter(Boolean).sort((left, right) => Number(right.allDay) - Number(left.allDay) || (left.startMinute ?? -1) - (right.startMinute ?? -1) || left.title.localeCompare(right.title) || left._index - right._index);
  const selectedEvents = candidates.slice(0, MAX_CALENDAR_REVIEW_EVENTS).map((event, index) => ({ id: `event-${String(index + 1).padStart(3, "0")}`, title: event.title, startMinute: event.startMinute, endMinute: event.endMinute, allDay: event.allDay }));
  const rawEntries = (Array.isArray(entries) ? entries : []).filter((entry) => String(entry?.date || "") === date && typeof entry?.content === "string" && entry.content.trim());
  const selectedEntries = rawEntries.map((entry, index) => ({ time: validTime(entry?.time) ? String(entry.time) : "", content: bounded(entry.content, 4000, false), createdAt: Number(entry?.createdAt) || index, _index: index }))
    .sort((left, right) => String(left.time).localeCompare(String(right.time)) || left.createdAt - right.createdAt || left._index - right._index)
    .slice(0, MAX_CALENDAR_REVIEW_ENTRIES)
    .map((entry, index) => ({ id: `entry-${String(index + 1).padStart(3, "0")}`, time: entry.time, content: entry.content }));
  const base = { schemaVersion: CALENDAR_DIARY_SCHEMA_VERSION, targetDate: date, locale: locale === "zh-CN" ? "zh-CN" : "en", events: selectedEvents, entries: selectedEntries };
  return { ...base, sourceFingerprint: hashFingerprint(JSON.stringify(base)), eventCandidateCount: rawEvents.length, omittedEventCount: Math.max(0, rawEvents.length - selectedEvents.length), entryCandidateCount: rawEntries.length, omittedEntryCount: Math.max(0, rawEntries.length - selectedEntries.length) };
}

export function buildCalendarDiaryLocalReview(input) {
  const matches = new Map(input.events.map((event) => [event.id, []])); const matchedEntries = new Set();
  for (const entry of input.entries) { const winner = input.events.map((event) => ({ event, score: matchScore(event, entry) })).sort((left, right) => right.score - left.score)[0]; if (winner?.score >= 0.34) { matches.get(winner.event.id).push(entry.id); matchedEntries.add(entry.id); } }
  const issues = [];
  for (const event of input.events) if (!(matches.get(event.id) || []).length) issues.push({ id: `calendar-unrecorded:${event.id}`, kind: "calendar-unrecorded", title: event.title, summary: event.allDay ? "No matching diary entry was found for this all-day event." : `No matching diary entry was found for ${displayTime(event.startMinute)}–${displayTime(event.endMinute)}.`, sourceIds: [event.id] });
  for (const entry of input.entries) if (!matchedEntries.has(entry.id)) issues.push({ id: `record-outside-calendar:${entry.id}`, kind: "record-outside-calendar", title: entry.time || "Diary entry", summary: bounded(entry.content.replace(/\s+/g, " "), 180), sourceIds: [entry.id] });
  let overlapCount = 0;
  for (let left = 0; left < input.events.length; left += 1) for (let right = left + 1; right < input.events.length; right += 1) if (overlaps(input.events[left], input.events[right])) { overlapCount += 1; const a = input.events[left]; const b = input.events[right]; issues.push({ id: `calendar-overlap:${a.id}:${b.id}`, kind: "calendar-overlap", title: `${a.title} · ${b.title}`, summary: `${displayTime(a.startMinute)}–${displayTime(a.endMinute)} overlaps ${displayTime(b.startMinute)}–${displayTime(b.endMinute)}.`, sourceIds: [a.id, b.id] }); }
  const matchedEventCount = [...matches.values()].filter((ids) => ids.length).length;
  return { status: !input.events.length ? "calendar-empty" : issues.length ? "needs-attention" : "aligned", facts: { eventCount: input.events.length, diaryCount: input.entries.length, matchedEventCount, unrecordedEventCount: input.events.length - matchedEventCount, outsideCalendarCount: input.entries.length - matchedEntries.size, overlapCount }, issues, matches: [...matches].map(([eventId, entryIds]) => ({ eventId, entryIds })) };
}

export function sanitizeCalendarDiaryReviewInput(value) {
  assertKeys(value, REQUEST_KEYS, invalidInput, "calendar diary review input");
  if (value.schemaVersion !== CALENDAR_DIARY_SCHEMA_VERSION || !validDate(value.targetDate) || !["en", "zh-CN"].includes(value.locale)) throw invalidInput("calendar diary review scope is invalid");
  const requestId = typeof value.requestId === "string" ? value.requestId.trim() : ""; const sourceFingerprint = typeof value.sourceFingerprint === "string" ? value.sourceFingerprint.trim() : "";
  if (!requestId || chars(requestId).length > 128 || !/^fnv1a-[0-9a-f]{8}$/.test(sourceFingerprint)) throw invalidInput("calendar diary review binding is invalid");
  if (!Array.isArray(value.events) || value.events.length < 1 || value.events.length > MAX_CALENDAR_REVIEW_EVENTS || !Array.isArray(value.entries) || value.entries.length > MAX_CALENDAR_REVIEW_ENTRIES) throw invalidInput("calendar diary review source counts are invalid");
  const seen = new Set();
  const events = value.events.map((event) => { assertKeys(event, EVENT_KEYS, invalidInput, "calendar event"); const id = bounded(event.id, 128); const title = bounded(event.title, 240); const allDay = event.allDay === true; const { startMinute, endMinute } = event; if (!id || seen.has(id) || !title || typeof event.allDay !== "boolean" || (allDay ? startMinute !== null || endMinute !== null : !Number.isInteger(startMinute) || !Number.isInteger(endMinute) || startMinute < 0 || endMinute > 1440 || endMinute <= startMinute)) throw invalidInput("calendar event is invalid"); seen.add(id); return { id, title, startMinute, endMinute, allDay }; });
  const entries = value.entries.map((entry) => { assertKeys(entry, ENTRY_KEYS, invalidInput, "diary entry"); const id = bounded(entry.id, 128); const { time } = entry; if (!id || seen.has(id) || typeof time !== "string" || (time !== "" && !validTime(time)) || typeof entry.content !== "string" || chars(entry.content).length > 4000 || !entry.content.trim()) throw invalidInput("diary entry is invalid"); seen.add(id); return { id, time, content: entry.content }; });
  return { schemaVersion: value.schemaVersion, requestId, targetDate: value.targetDate, sourceFingerprint, locale: value.locale, events, entries };
}

export function normalizeCalendarDiaryReviewOutput(value, input, generatedAt = Date.now(), providerId = "calendar-diary-review") {
  assertKeys(value, OUTPUT_KEYS, invalidResponse, "calendar diary review output"); const overview = typeof value.overview === "string" ? value.overview.trim() : "";
  if (!overview || chars(overview).length > 500 || !Array.isArray(value.suggestions) || value.suggestions.length > MAX_CALENDAR_REVIEW_SUGGESTIONS) throw invalidResponse("calendar diary review output is invalid");
  const allowed = new Set([...input.events, ...input.entries].map((item) => item.id)); const used = new Set();
  const suggestions = value.suggestions.map((suggestion) => { assertKeys(suggestion, SUGGESTION_KEYS, invalidResponse, "calendar diary suggestion"); const { kind } = suggestion; const title = typeof suggestion.title === "string" ? suggestion.title.trim() : ""; const summary = typeof suggestion.summary === "string" ? suggestion.summary.trim() : ""; if (!CALENDAR_REVIEW_KINDS.includes(kind) || !title || chars(title).length > 160 || !summary || chars(summary).length > 360 || !Array.isArray(suggestion.sourceIds) || suggestion.sourceIds.length < 1 || suggestion.sourceIds.length > 4) throw invalidResponse("calendar diary suggestion is invalid"); const sourceIds = suggestion.sourceIds.map((raw) => typeof raw === "string" ? raw.trim() : ""); const key = `${kind}:${sourceIds.join(",")}`; if (sourceIds.some((id) => !allowed.has(id)) || new Set(sourceIds).size !== sourceIds.length || used.has(key)) throw invalidResponse("calendar diary suggestion sources are invalid"); used.add(key); return { kind, title, summary, sourceIds }; });
  const result = { schemaVersion: CALENDAR_DIARY_SCHEMA_VERSION, requestId: input.requestId, targetDate: input.targetDate, sourceFingerprint: input.sourceFingerprint, overview, suggestions, providerId: String(providerId || "").trim(), generatedAt: Number(generatedAt) };
  if (!result.providerId || chars(result.providerId).length > 128 || !Number.isFinite(result.generatedAt) || result.generatedAt < 0) throw invalidResponse("calendar diary review metadata is invalid"); return result;
}

export function validateCalendarDiaryReviewResponse(value, input) {
  assertKeys(value, RESPONSE_KEYS, invalidResponse, "calendar diary review response");
  if (value.schemaVersion !== input.schemaVersion || value.requestId !== input.requestId || value.targetDate !== input.targetDate || value.sourceFingerprint !== input.sourceFingerprint) throw invalidResponse("calendar diary review response is stale");
  return normalizeCalendarDiaryReviewOutput({ overview: value.overview, suggestions: value.suggestions }, input, value.generatedAt, value.providerId);
}

export { validDate, validTime };
