import { normalizeState } from "../../../lib/data.mjs";
import { normalizePlanBlock } from "../../../lib/plan-model.mjs";
import {
  AGENT_BRIDGE_MAX_CONTENT_CHARS,
  AGENT_BRIDGE_MAX_PLANS,
  AGENT_BRIDGE_MAX_RECORDS,
  AGENT_BRIDGE_MAX_RESPONSE_BYTES,
  byteLength,
  cloneJson,
  dateDistanceInclusive,
  isRealDate,
  stableFingerprint
} from "./schema.mjs";

function normalizedState(state) {
  return normalizeState(state);
}

function metadata({ revision = 0, updatedAt = new Date().toISOString(), offline = false } = {}) {
  return {
    schemaVersion: 1,
    revision: Number.isInteger(Number(revision)) && Number(revision) >= 0 ? Number(revision) : 0,
    offline: Boolean(offline),
    updatedAt: String(updatedAt)
  };
}

function finalizeSnapshot(data, options = {}, initialTruncated = false) {
  const base = metadata(options);
  let output = {
    ...base,
    fingerprint: stableFingerprint(data),
    data,
    truncated: Boolean(initialTruncated)
  };
  if (byteLength(JSON.stringify(output)) <= AGENT_BRIDGE_MAX_RESPONSE_BYTES) return output;

  let boundedData = Array.isArray(data) ? [...data] : data;
  let truncated = true;
  if (Array.isArray(boundedData)) {
    while (boundedData.length && byteLength(JSON.stringify({ ...base, fingerprint: stableFingerprint(boundedData), data: boundedData, truncated })) > AGENT_BRIDGE_MAX_RESPONSE_BYTES) {
      boundedData.pop();
    }
  } else {
    boundedData = {};
  }
  output = {
    ...base,
    fingerprint: stableFingerprint(boundedData),
    data: boundedData,
    truncated
  };
  if (byteLength(JSON.stringify(output)) > AGENT_BRIDGE_MAX_RESPONSE_BYTES) {
    throw new Error("agent bridge response metadata exceeds the allowed size");
  }
  return output;
}

function projectExternalRef(value) {
  if (!value || typeof value !== "object") return null;
  return {
    provider: String(value.provider || ""),
    calendarId: String(value.calendarId || ""),
    eventId: String(value.eventId || ""),
    etag: value.etag ? String(value.etag) : null
  };
}

export function projectPlanBlock(candidate) {
  const block = normalizePlanBlock(candidate);
  return {
    id: block.id,
    date: block.date,
    startTime: block.startTime,
    endTime: block.endTime,
    title: block.title,
    source: block.source,
    flexibility: block.flexibility,
    externalRef: projectExternalRef(block.externalRef),
    readOnly: block.source === "google"
  };
}

function projectRecord(candidate, categoryMap) {
  const content = String(candidate.content || "");
  const contentTruncated = Array.from(content).length > AGENT_BRIDGE_MAX_CONTENT_CHARS;
  const projected = {
    id: String(candidate.id),
    date: String(candidate.date),
    time: String(candidate.time || ""),
    content: contentTruncated ? Array.from(content).slice(0, AGENT_BRIDGE_MAX_CONTENT_CHARS).join("") : content,
    categoryId: String(candidate.categoryId),
    categoryName: categoryMap.get(String(candidate.categoryId))?.name || null,
    templateId: candidate.templateId ? String(candidate.templateId) : null,
    fieldValues: candidate.fieldValues && typeof candidate.fieldValues === "object" ? cloneJson(candidate.fieldValues) : {},
    tags: Array.isArray(candidate.tags) ? candidate.tags.map((tag) => String(tag)).slice(0, 50) : []
  };
  return { projected, contentTruncated };
}

export function createPlansSnapshot({ state, date, revision = 0, updatedAt, offline = false }) {
  if (!isRealDate(date)) throw new Error("date must be a real YYYY-MM-DD date");
  const current = normalizedState(state);
  const source = current.planBlocks
    .filter((block) => block.date === date)
    .sort((a, b) => a.startTime.localeCompare(b.startTime) || a.createdAt - b.createdAt);
  const truncated = source.length > AGENT_BRIDGE_MAX_PLANS;
  const data = source.slice(0, AGENT_BRIDGE_MAX_PLANS).map(projectPlanBlock);
  return finalizeSnapshot(data, { revision, updatedAt, offline }, truncated);
}

export function createRecordsSnapshot({ state, from, to, revision = 0, updatedAt, offline = false }) {
  const days = dateDistanceInclusive(from, to);
  if (days === null) throw new Error("record range must be valid and ordered");
  if (days > 7) throw new Error("record range cannot exceed 7 days");
  const current = normalizedState(state);
  const categoryMap = new Map(current.categories.map((category) => [category.id, category]));
  const source = current.entries
    .filter((entry) => entry.date >= from && entry.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date) || String(a.time).localeCompare(String(b.time)) || a.createdAt - b.createdAt);
  let truncated = source.length > AGENT_BRIDGE_MAX_RECORDS;
  const data = source.slice(0, AGENT_BRIDGE_MAX_RECORDS).map((entry) => {
    const { projected, contentTruncated } = projectRecord(entry, categoryMap);
    truncated = truncated || contentTruncated;
    return projected;
  });
  return finalizeSnapshot(data, { revision, updatedAt, offline }, truncated);
}

export function createCategoriesSnapshot({ state, revision = 0, updatedAt, offline = false }) {
  const current = normalizedState(state);
  const data = {
    domains: current.domains.map((domain) => ({ id: domain.id, name: domain.name })),
    categories: current.categories.map((category) => ({ id: category.id, domainId: category.domainId, name: category.name }))
  };
  return finalizeSnapshot(data, { revision, updatedAt, offline });
}
