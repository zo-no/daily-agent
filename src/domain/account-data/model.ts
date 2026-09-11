import type { AccountDataPayload } from "@/shared/contracts";

/**
 * Transitional typed facade over the already-tested pure data model.
 *
 * The facade is the migration target for callers. The `.mjs` implementation
 * remains temporarily available to Node-based compatibility tests until every
 * consumer can load the TypeScript entry directly.
 */
import {
  createInitialState as createInitialStateRuntime,
  makeId as makeIdRuntime,
  localDate as localDateRuntime,
  localTime as localTimeRuntime,
  localTimeWithSeconds as localTimeWithSecondsRuntime,
  shiftDate as shiftDateRuntime,
  sanitizeTags as sanitizeTagsRuntime,
  fixedContentParts as fixedContentPartsRuntime,
  hasFixedContent as hasFixedContentRuntime,
  hasTemplateContent as hasTemplateContentRuntime,
  composeTemplateContent as composeTemplateContentRuntime,
  sortByOrder as sortByOrderRuntime,
  normalizeState as normalizeStateRuntime,
  restoreState as restoreStateRuntime,
  markdownForDate as markdownForDateRuntime,
  markdownForAll as markdownForAllRuntime,
  structurePayload as structurePayloadRuntime,
  generalStructureTemplate as generalStructureTemplateRuntime,
  backupPayload as backupPayloadRuntime
} from "@/lib/data.mjs";
export { DEFAULT_MARKDOWN_SETTINGS } from "@/lib/default-data.mjs";

export const STORAGE_KEY = "log-note:data:v1";

export const createInitialState = (): AccountDataPayload => createInitialStateRuntime() as unknown as AccountDataPayload;
export const makeId = (prefix: string): string => makeIdRuntime(prefix);
export const localDate = (date?: Date): string => localDateRuntime(date);
export const localTime = (date?: Date): string => localTimeRuntime(date);
export const localTimeWithSeconds = (date?: Date): string => localTimeWithSecondsRuntime(date);
export const shiftDate = (dateString: string, amount: number): string => shiftDateRuntime(dateString, amount);
export const sanitizeTags = (value: unknown): string[] => sanitizeTagsRuntime(value);
export const fixedContentParts = (content: unknown): { label: string; value: string } => fixedContentPartsRuntime(content);
export const hasFixedContent = (content: unknown): boolean => hasFixedContentRuntime(content);
export const hasTemplateContent = (item: unknown): boolean => hasTemplateContentRuntime(item);
export const composeTemplateContent = (item: Record<string, unknown>, fieldValues?: Record<string, unknown>): string => composeTemplateContentRuntime(item, fieldValues);
export const sortByOrder = <T extends Record<string, unknown>>(items: T[] = []): T[] => sortByOrderRuntime(items);
export const normalizeState = (candidate: unknown): AccountDataPayload => normalizeStateRuntime(candidate) as AccountDataPayload;
export const restoreState = (candidate: unknown): AccountDataPayload => restoreStateRuntime(candidate) as AccountDataPayload;
export const markdownForDate = (state: AccountDataPayload, date: string): string => markdownForDateRuntime(state, date);
export const markdownForAll = (state: AccountDataPayload): string => markdownForAllRuntime(state);
export const structurePayload = (state: AccountDataPayload): string => structurePayloadRuntime(state);
export const generalStructureTemplate = (): string => generalStructureTemplateRuntime();
export const backupPayload = (state: AccountDataPayload): string => backupPayloadRuntime(state);
