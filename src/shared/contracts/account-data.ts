/** @fileoverview Defines account-owned records, plans, goals, recovery, and sync contracts shared across runtimes. */

type JsonObject = Record<string, unknown>;

export interface Domain {
  id: string;
  name: string;
  order: number;
}

export interface Category {
  id: string;
  domainId: string;
  name: string;
  order: number;
}

export interface TemplateField {
  id: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "rating";
  options: string[];
  placeholder: string;
  required: boolean;
}

export type TemplateSchedule =
  | { cadence: "timepoint"; time: string }
  | { cadence: "daily" }
  | { cadence: "weekly"; weekday: number }
  | null;

export interface Template {
  id: string;
  name: string;
  categoryId: string;
  order: number;
  recordType: "linear" | "periodic";
  schedule: TemplateSchedule;
  homeVisible: boolean;
  inputMode: "free" | "structured" | "value";
  tags: string[];
  prompt: string;
  skeleton: string;
  fields: TemplateField[];
}

export interface AttachmentReference {
  id: string;
  kind: "image";
  storage: "indexeddb";
  mediaType: string;
  bytes: number;
  name: string;
  alt: string;
  createdAt: number;
}

export interface AccountEntry {
  id: string;
  date: string;
  time: string;
  content: string;
  categoryId: string;
  tags: string[];
  templateId: string | null;
  fieldValues: JsonObject;
  /** Seed records predate attachment refs; normalization adds an empty array. */
  attachments?: AttachmentReference[];
  source: string | null;
  sourceLine: string | null;
  createdAt: number;
}

export interface PlanBlock {
  id: string;
  date: string;
  title: string;
  startTime: string;
  endTime: string;
  source: "local" | "google";
  flexibility: "fixed" | "movable" | "resizable";
  goalId: string | null;
  priority: "high" | "medium" | "low" | null;
  externalRef: JsonObject | null;
  createdAt: number;
  updatedAt: number;
}

export interface GoalKeyResult {
  id: string;
  content: string;
  status: "active" | "completed" | "paused";
  targetValue: number | null;
  currentValue: number | null;
  unit: string;
  recordIds: string[];
}

export interface Goal {
  id: string;
  content: string;
  startDate: string;
  endDate: string;
  status: "active" | "completed" | "paused";
  createdAt: number;
  updatedAt: number;
  keyResults: GoalKeyResult[];
  recordIds: string[];
}

export interface MarkdownSettings {
  layout: "grouped" | "timeline";
  domainHeading: string;
  categoryHeading: string;
  entryLine: string;
  allDayHeading: string;
  daySeparator: string;
}

export interface AccountDataPayload {
  version: number;
  structureSchemaVersion: number;
  seedVersion: number;
  domains: Domain[];
  categories: Category[];
  templates: Template[];
  markdownSettings: MarkdownSettings;
  entries: AccountEntry[];
  planBlocks: PlanBlock[];
  goals: Goal[];
}

export interface LocalRecoveryState {
  mode: "new" | "ready" | "recovery-needed";
  state: AccountDataPayload;
  canPersist: boolean;
  rawPayload: string | null;
  error: unknown;
}

export interface LocalWriteResult {
  ok: boolean;
  blocked: boolean;
  error: unknown;
}

export type SyncEntityKind = "record" | "plan";

export type SyncOperation = "upsert" | "delete";

export interface CloudDocument {
  userId: string;
  revision: number;
  payload: AccountDataPayload;
  updatedAt: string;
  deviceId: string;
}

export interface SyncChange {
  kind: SyncEntityKind;
  entityId: string;
  operation: SyncOperation;
  payload: AccountEntry | PlanBlock | null;
  itemVersion: number;
  serverSeq: number;
  operationId: string;
  deviceId: string;
  createdAt: string;
}

export interface SyncMutation {
  kind: SyncEntityKind;
  operation: SyncOperation;
  entityId: string;
  baseVersion: number;
  payload: AccountEntry | PlanBlock | null;
  operationId: string;
  deviceId: string;
  clientAt: number;
}

export interface CloudRevision {
  revision: number;
  userId: string;
  updatedAt?: string;
}
