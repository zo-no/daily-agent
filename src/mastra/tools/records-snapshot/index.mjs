import { z } from "zod";
import {
  AGENT_BRIDGE_MAX_RECORDS,
  AGENT_BRIDGE_MAX_RESPONSE_BYTES,
  dateDistanceInclusive,
  isRealDate,
  stableFingerprint
} from "../../../modules/agent-bridge/mcp/schema.mjs";
import { createTool } from "@mastra/core/tools";

export const READ_RECORDS_SNAPSHOT_TOOL_ID = "read-records-snapshot";
export const READ_RECORDS_SNAPSHOT_SCHEMA_VERSION = 1;

const recordInputSchema = z.object({
  id: z.string().min(1).max(180),
  date: z.string().refine(isRealDate, "record date must be a real YYYY-MM-DD date"),
  time: z.string().max(8),
  content: z.string().max(10_000),
  categoryId: z.string().min(1).max(180),
  categoryName: z.string().max(240).nullable(),
  templateId: z.string().max(180).nullable(),
  fieldValues: z.record(z.string(), z.unknown()),
  tags: z.array(z.string().max(120)).max(50)
}).strict();

export const readRecordsSnapshotInputSchema = z.object({
  schemaVersion: z.literal(READ_RECORDS_SNAPSHOT_SCHEMA_VERSION),
  from: z.string().refine(isRealDate, "from must be a real YYYY-MM-DD date"),
  to: z.string().refine(isRealDate, "to must be a real YYYY-MM-DD date"),
  records: z.array(recordInputSchema).max(AGENT_BRIDGE_MAX_RECORDS),
  revision: z.number().int().nonnegative().default(0),
  updatedAt: z.string().max(80).default("1970-01-01T00:00:00.000Z"),
  offline: z.boolean().default(false)
}).strict().superRefine((value, context) => {
  if (dateDistanceInclusive(value.from, value.to) === null || value.from > value.to) {
    context.addIssue({ code: "custom", path: ["to"], message: "record range must be valid and ordered" });
  } else if (dateDistanceInclusive(value.from, value.to) > 7) {
    context.addIssue({ code: "custom", path: ["to"], message: "record range cannot exceed 7 days" });
  }
  const ids = new Set();
  value.records.forEach((record, index) => {
    if (ids.has(record.id)) context.addIssue({ code: "custom", path: ["records", index, "id"], message: "record IDs must be unique" });
    ids.add(record.id);
  });
  if (Buffer.byteLength(JSON.stringify(value), "utf8") > AGENT_BRIDGE_MAX_RESPONSE_BYTES) {
    context.addIssue({ code: "custom", path: ["records"], message: "record snapshot exceeds the allowed size" });
  }
});

const snapshotMetaSchema = z.object({
  schemaVersion: z.number(), revision: z.number(), offline: z.boolean(), updatedAt: z.string(), fingerprint: z.string(), truncated: z.boolean()
}).strict();

export const readRecordsSnapshotOutputSchema = snapshotMetaSchema.extend({
  from: z.string(),
  to: z.string(),
  data: z.array(recordInputSchema)
}).strict();

export const readRecordsSnapshotTool = createTool({
  id: READ_RECORDS_SNAPSHOT_TOOL_ID,
  description: "Read a bounded, caller-supplied Log Note record snapshot when an Agent needs factual records for a date range. Never access account storage, network, attachments, credentials, or persistence.",
  inputSchema: readRecordsSnapshotInputSchema,
  outputSchema: readRecordsSnapshotOutputSchema,
  execute: async (inputData, context) => {
    if (context?.abortSignal?.aborted) throw new DOMException("Record snapshot Tool execution was aborted", "AbortError");
    const input = readRecordsSnapshotInputSchema.parse(inputData);
    const snapshot = {
      schemaVersion: input.schemaVersion,
      revision: input.revision,
      offline: input.offline,
      updatedAt: input.updatedAt,
      fingerprint: "",
      data: input.records,
      truncated: false
    };
    const result = readRecordsSnapshotOutputSchema.parse({
      ...snapshot,
      fingerprint: stableFingerprint(snapshot.data),
      from: input.from,
      to: input.to
    });
    return result;
  }
});
