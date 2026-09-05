import { z } from "zod";

export const DAILY_LOG_SCHEMA_VERSION = 1;
export const DAILY_LOG_MAX_ITEMS = 30;
export const DAILY_LOG_MAX_ID_CHARS = 96;
export const DAILY_LOG_MAX_SUMMARY_CHARS = 800;
export const DAILY_LOG_MAX_SOURCE_CHARS = 8000;
export const DAILY_LOG_STATUSES = Object.freeze(["completed", "in-progress", "blocked"]);

function unicodeLength(value) {
  return Array.from(String(value ?? "")).length;
}

export function normalizeDailyLogText(value) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function isRealDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

const idSchema = z.string().superRefine((value, context) => {
  const normalized = normalizeDailyLogText(value);
  if (!normalized || unicodeLength(normalized) > DAILY_LOG_MAX_ID_CHARS) {
    context.addIssue({ code: "custom", message: "work item id is invalid" });
  }
});

const summarySchema = z.string().superRefine((value, context) => {
  const normalized = normalizeDailyLogText(value);
  if (!normalized || unicodeLength(value) > DAILY_LOG_MAX_SUMMARY_CHARS) {
    context.addIssue({ code: "custom", message: "work item summary is invalid" });
  }
});

export const dailyLogWorkItemSchema = z.object({
  id: idSchema,
  status: z.enum(DAILY_LOG_STATUSES),
  summary: summarySchema
}).strict();

export const dailyLogInputSchema = z.object({
  schemaVersion: z.literal(DAILY_LOG_SCHEMA_VERSION),
  targetDate: z.string().refine(isRealDate, "targetDate must be a real YYYY-MM-DD date"),
  locale: z.enum(["zh-CN", "en"]),
  items: z.array(dailyLogWorkItemSchema).min(1).max(DAILY_LOG_MAX_ITEMS)
}).strict().superRefine((value, context) => {
  const ids = new Set();
  let totalChars = 0;

  value.items.forEach((item, index) => {
    const id = normalizeDailyLogText(item.id);
    if (ids.has(id)) {
      context.addIssue({
        code: "custom",
        path: ["items", index, "id"],
        message: "work item ids must be unique"
      });
    }
    ids.add(id);
    totalChars += unicodeLength(item.id) + unicodeLength(item.summary);
  });

  if (totalChars > DAILY_LOG_MAX_SOURCE_CHARS) {
    context.addIssue({
      code: "custom",
      path: ["items"],
      message: "daily log source text exceeds the allowed size"
    });
  }
});

const sourceIdSchema = z.string()
  .min(1)
  .refine((value) => unicodeLength(value) <= DAILY_LOG_MAX_ID_CHARS, "source id is too long");

export const dailyLogRecordCandidateSchema = z.object({
  date: z.string().refine(isRealDate, "record date must be a real YYYY-MM-DD date"),
  time: z.literal(""),
  content: z.string().min(1).refine((value) => unicodeLength(value) <= 10_000, "record content is too long")
}).strict();

export const dailyLogProposalSchema = z.object({
  schemaVersion: z.literal(DAILY_LOG_SCHEMA_VERSION),
  kind: z.literal("daily-work-log"),
  targetDate: z.string().refine(isRealDate, "targetDate must be a real YYYY-MM-DD date"),
  locale: z.enum(["zh-CN", "en"]),
  sourceIds: z.array(sourceIdSchema).min(1).max(DAILY_LOG_MAX_ITEMS),
  sourceFingerprint: z.string().regex(/^fnv1a-[0-9a-f]{8}$/),
  recordCandidate: dailyLogRecordCandidateSchema,
  writePolicy: z.literal("preview-required")
}).strict();
