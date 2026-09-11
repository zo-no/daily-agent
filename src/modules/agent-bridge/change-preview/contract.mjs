import { z } from "zod";
import { operationSchema, planDraftSchema, recordDraftSchema } from "../mcp/schema.mjs";

export const CHANGE_PREVIEW_SCHEMA_VERSION = 1;

const id = z.string().min(1).max(180);
const category = z.object({ id, domainId: id.optional(), name: z.string().min(1).max(240) }).strict();
const template = z.object({ id, name: z.string().min(1).max(240).optional() }).strict();
const state = z.object({
  categories: z.array(category),
  templates: z.array(template),
  planBlocks: z.array(z.record(z.string(), z.unknown())).optional()
}).strict();

export const changePreviewInputSchema = z.object({
  schemaVersion: z.literal(CHANGE_PREVIEW_SCHEMA_VERSION),
  operation: operationSchema,
  state,
  draft: z.union([planDraftSchema.partial(), recordDraftSchema.partial()]).default({}),
  existing: z.record(z.string(), z.unknown()).nullable().default(null)
}).strict();

export const changePreviewOutputSchema = z.object({
  schemaVersion: z.literal(CHANGE_PREVIEW_SCHEMA_VERSION),
  kind: z.enum(["plan", "record"]),
  operation: operationSchema,
  candidate: z.record(z.string(), z.unknown()),
  before: z.record(z.string(), z.unknown()).nullable(),
  after: z.record(z.string(), z.unknown()).nullable(),
  sourceFingerprint: z.string().regex(/^fnv1a-[0-9a-f]{8}$/u),
  writePolicy: z.literal("preview-required")
}).strict();

export const planPreviewInputSchema = changePreviewInputSchema.extend({
  draft: planDraftSchema.partial().default({}),
  existing: z.record(z.string(), z.unknown()).nullable().default(null)
}).strict();

export const recordPreviewInputSchema = changePreviewInputSchema.extend({
  draft: recordDraftSchema.partial().default({}),
  existing: z.record(z.string(), z.unknown()).nullable().default(null)
}).strict();
