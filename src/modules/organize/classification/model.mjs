/**
 * @fileoverview Pure selection and category-apply helpers for smart organize.
 */

import { sanitizeTags } from "../../../lib/data.mjs";

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

function byOrder(left, right) {
  return (Number(left?.order) || 0) - (Number(right?.order) || 0)
    || String(left?.name || "").localeCompare(String(right?.name || ""));
}

function boundedHints(values) {
  return [...new Set(values
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => value.slice(0, 80)))]
    .slice(0, 16);
}

/** Return only the user's existing domain/category structure as bounded candidates. */
export function availableClassificationCategories(state) {
  const templates = Array.isArray(state?.templates) ? state.templates : [];
  const categoriesByDomain = new Map();
  (Array.isArray(state?.categories) ? state.categories : []).forEach((category) => {
    if (!category?.id || !category?.domainId || !category?.name) return;
    if (!categoriesByDomain.has(category.domainId)) categoriesByDomain.set(category.domainId, []);
    categoriesByDomain.get(category.domainId).push(category);
  });

  return (Array.isArray(state?.domains) ? state.domains : [])
    .filter((domain) => domain?.id && domain?.name)
    .sort(byOrder)
    .flatMap((domain) => (categoriesByDomain.get(domain.id) || []).sort(byOrder).map((category) => {
      const categoryTemplates = templates.filter((template) => template?.categoryId === category.id);
      return {
        id: String(category.id),
        name: String(category.name),
        domainId: String(domain.id),
        domainName: String(domain.name),
        hints: boundedHints([
          domain.name,
          category.name,
          ...categoryTemplates.flatMap((template) => [
            template.name,
            template.prompt,
            ...(template.tags || [])
          ])
        ])
      };
    }));
}

/** Select ordinary records from exactly one user-controlled date. */
export function organizeEntries({ entries = [], templates = [], date }) {
  const templateMap = new Map(templates.map((template) => [template.id, template]));
  if (!Number.isFinite(dateOrdinal(date))) return [];

  return entries.filter((entry) => {
    if (templateMap.get(entry.templateId)?.recordType === "periodic") return false;
    return entry.date === date;
  }).sort((left, right) => (
    String(right.time || "").localeCompare(String(left.time || ""))
    || Number(right.createdAt || 0) - Number(left.createdAt || 0)
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

/** Apply one explicitly confirmed existing category per entry and preserve every other field. */
export function applyOrganization(state, changes) {
  const validCategoryIds = new Set((state?.categories || []).map((category) => category.id));
  const changeMap = new Map();
  (Array.isArray(changes) ? changes : []).forEach((change) => {
    if (!change?.entryId || changeMap.has(change.entryId) || !validCategoryIds.has(change.categoryId)) return;
    changeMap.set(change.entryId, change.categoryId);
  });
  return {
    ...state,
    entries: state.entries.map((entry) => {
      const categoryId = changeMap.get(entry.id);
      return categoryId ? { ...entry, categoryId } : entry;
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
