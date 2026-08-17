/**
 * @fileoverview Pure selection and apply helpers for the local smart-organize workspace.
 */

import { sanitizeTags } from "./data.mjs";

function dateOrdinal(dateString) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ""));
  if (!match) return Number.NaN;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const value = new Date(Date.UTC(year, month - 1, day));
  if (value.getUTCFullYear() !== year || value.getUTCMonth() !== month - 1 || value.getUTCDate() !== day) return Number.NaN;
  return value.getTime() / 86_400_000;
}

/** Return the user's existing tag vocabulary without inventing new labels. */
export function availableClassificationTags(state) {
  return sanitizeTags([
    ...(state?.templates || []).flatMap((template) => template.tags || []),
    ...(state?.entries || []).flatMap((entry) => entry.tags || [])
  ]).sort((left, right) => left.localeCompare(right));
}

/** Select ordinary records from exactly one user-controlled date. */
export function organizeEntries({ entries = [], templates = [], date }) {
  const templateMap = new Map(templates.map((template) => [template.id, template]));
  if (!Number.isFinite(dateOrdinal(date))) return [];

  return entries.filter((entry) => {
    if (templateMap.get(entry.templateId)?.recordType === "periodic") return false;
    return entry.date === date;
  }).sort((left, right) => (
    String(right.time || "").localeCompare(String(left.time || "")) ||
    Number(right.createdAt || 0) - Number(left.createdAt || 0)
  ));
}

/** Capture only reversible organization fields; raw content is intentionally excluded. */
export function organizationSnapshot(entries, entryIds) {
  const selected = new Set(entryIds);
  return entries.filter((entry) => selected.has(entry.id)).map((entry) => ({
    id: entry.id,
    categoryId: entry.categoryId,
    tags: [...sanitizeTags(entry.tags)]
  }));
}

/** Apply explicitly confirmed tag changes while preserving every other entry field. */
export function applyOrganization(state, changes) {
  const changeMap = new Map();
  changes.forEach((change) => {
    const current = changeMap.get(change.entryId) || { entryId: change.entryId, tags: [] };
    changeMap.set(change.entryId, {
      ...current,
      categoryId: change.categoryId || current.categoryId,
      tags: sanitizeTags([...(current.tags || []), ...(change.tags || [])]).slice(0, 3)
    });
  });
  return {
    ...state,
    entries: state.entries.map((entry) => {
      const change = changeMap.get(entry.id);
      if (!change) return entry;
      return {
        ...entry,
        categoryId: change.categoryId || entry.categoryId,
        tags: sanitizeTags([...(entry.tags || []), ...(change.tags || [])]).slice(0, 3)
      };
    })
  };
}

/** Restore a prior organization snapshot without touching raw note content. */
export function restoreOrganization(state, snapshot) {
  const snapshotMap = new Map(snapshot.map((item) => [item.id, item]));
  return {
    ...state,
    entries: state.entries.map((entry) => {
      const previous = snapshotMap.get(entry.id);
      return previous ? { ...entry, categoryId: previous.categoryId, tags: [...previous.tags] } : entry;
    })
  };
}
