import { z } from "zod";

export const AGENT_BRIDGE_SCHEMA_VERSION = 1;
export const AGENT_BRIDGE_MAX_RECORDS = 50;
export const AGENT_BRIDGE_MAX_PLANS = 30;
export const AGENT_BRIDGE_MAX_DAYS = 7;
export const AGENT_BRIDGE_MAX_CONTENT_CHARS = 10_000;
export const AGENT_BRIDGE_MAX_RESPONSE_BYTES = 256 * 1024;
export const AGENT_BRIDGE_PROPOSAL_TTL_MS = 5 * 60 * 1000;
export const AGENT_BRIDGE_PAIRING_IDLE_TTL_MS = 30 * 60 * 1000;

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/u;
const ID_PATTERN = /^[\p{L}\p{N}_:.@/-]+$/u;

export function unicodeLength(value) {
  return Array.from(String(value ?? "")).length;
}

export function isRealDate(value) {
  const match = DATE_PATTERN.exec(String(value ?? ""));
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function isValidTime(value, { allowEmpty = false } = {}) {
  const text = String(value ?? "");
  return (allowEmpty && text === "") || TIME_PATTERN.test(text);
}

export function dateDistanceInclusive(from, to) {
  if (!isRealDate(from) || !isRealDate(to)) return null;
  const [fromYear, fromMonth, fromDay] = from.split("-").map(Number);
  const [toYear, toMonth, toDay] = to.split("-").map(Number);
  const start = Date.UTC(fromYear, fromMonth - 1, fromDay);
  const end = Date.UTC(toYear, toMonth - 1, toDay);
  if (end < start) return null;
  return Math.floor((end - start) / 86_400_000) + 1;
}

const boundedIdSchema = z.string().min(1).max(180).refine((value) => ID_PATTERN.test(value), "id contains unsupported characters");
const requestIdSchema = z.string().min(1).max(180).refine((value) => ID_PATTERN.test(value), "requestId contains unsupported characters");
const dateSchema = z.string().refine(isRealDate, "date must be a real YYYY-MM-DD date");
const timeSchema = z.string().refine((value) => isValidTime(value), "time must be HH:mm or HH:mm:ss");
const optionalTimeSchema = z.string().refine((value) => isValidTime(value, { allowEmpty: true }), "time must be empty, HH:mm, or HH:mm:ss");

export const requestEnvelopeSchema = z.object({
  protocolVersion: z.literal(AGENT_BRIDGE_SCHEMA_VERSION),
  requestId: requestIdSchema
}).strict();

export const planQuerySchema = requestEnvelopeSchema.extend({ date: dateSchema }).strict();

export const recordQuerySchema = requestEnvelopeSchema.extend({
  from: dateSchema,
  to: dateSchema
}).strict().superRefine((value, context) => {
  const days = dateDistanceInclusive(value.from, value.to);
  if (days === null) {
    context.addIssue({ code: "custom", path: ["to"], message: "to must be on or after from" });
  } else if (days > AGENT_BRIDGE_MAX_DAYS) {
    context.addIssue({ code: "custom", path: ["to"], message: `date range cannot exceed ${AGENT_BRIDGE_MAX_DAYS} days` });
  }
});

export const categoryQuerySchema = requestEnvelopeSchema;
const flexibilitySchema = z.enum(["fixed", "movable", "resizable"]);

export const planDraftSchema = z.object({
  date: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  title: z.string().min(1).max(240),
  flexibility: flexibilitySchema
}).strict();

export const recordDraftSchema = z.object({
  date: dateSchema,
  time: optionalTimeSchema,
  content: z.string().min(1).max(AGENT_BRIDGE_MAX_CONTENT_CHARS),
  categoryId: boundedIdSchema,
  templateId: boundedIdSchema.nullable().optional(),
  fieldValues: z.record(z.string(), z.unknown()).optional(),
  tags: z.array(z.string().max(120)).max(50).optional()
}).strict();

export const operationSchema = z.enum(["create", "update", "delete"]);
export const targetSchema = z.object({
  kind: z.enum(["plan", "record"]),
  id: boundedIdSchema
}).strict();

export function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

/** Stable, non-secret fingerprint for a validated request or projection. */
export function stableFingerprint(value) {
  const input = typeof value === "string" ? value : JSON.stringify(canonicalize(value));
  let hash = 0x811c9dc5;
  for (const byte of new TextEncoder().encode(input)) {
    hash ^= byte;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `fnv1a-${hash.toString(16).padStart(8, "0")}`;
}

export function byteLength(value) {
  return new TextEncoder().encode(String(value ?? "")).byteLength;
}

export function boundedJson(value, maxBytes = AGENT_BRIDGE_MAX_RESPONSE_BYTES) {
  const serialized = JSON.stringify(value);
  if (byteLength(serialized) > maxBytes) throw new Error("agent bridge response exceeds the allowed size");
  return serialized;
}
