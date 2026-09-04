/**
 * @fileoverview Log Note 的版本化结构、旧数据迁移、备份与 Markdown 导出。
 */

import { DAILY_SEED_VERSION, createDailySeedEntries, ensureDailySeed } from "./seed.mjs";
import {
  cloneTemplate,
  DEFAULT_CATEGORIES,
  DEFAULT_DOMAINS,
  DEFAULT_MARKDOWN_SETTINGS,
  DEFAULT_TEMPLATES
} from "./default-data.mjs";
import { normalizeAttachmentRefs } from "./attachment-model.mjs";
import { normalizePlanBlocks } from "./plan-model.mjs";

export { DEFAULT_MARKDOWN_SETTINGS } from "./default-data.mjs";

// 保留旧 key，才能在同一浏览器中读取并迁移 v1 数据。
export const STORAGE_KEY = "log-note:data:v1";
const DATA_VERSION = 4;
const STRUCTURE_SCHEMA_VERSION = 2;

const FIELD_TYPES = new Set(["text", "textarea", "number", "select", "rating"]);
const INPUT_MODES = new Set(["free", "structured", "value"]);
const RECORD_TYPES = new Set(["linear", "periodic"]);
const CADENCES = new Set(["timepoint", "daily", "weekly"]);

export function sortByOrder(items = []) {
  return [...items].sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0) || String(a.name).localeCompare(String(b.name)));
}

export function createInitialState() {
  return {
    version: DATA_VERSION,
    structureSchemaVersion: STRUCTURE_SCHEMA_VERSION,
    seedVersion: DAILY_SEED_VERSION,
    domains: DEFAULT_DOMAINS.map((item) => ({ ...item })),
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    templates: DEFAULT_TEMPLATES.map(cloneTemplate),
    markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS },
    entries: createDailySeedEntries(),
    planBlocks: []
  };
}

export function makeId(prefix) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function localTime(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function localTimeWithSeconds(date = new Date()) {
  return `${localTime(date)}:${String(date.getSeconds()).padStart(2, "0")}`;
}

export function shiftDate(dateString, amount) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);
  return localDate(date);
}

export function sanitizeTags(value) {
  const values = Array.isArray(value) ? value : String(value || "").split(/[，,\s]+/);
  return [...new Set(values.map((tag) => String(tag).trim().replace(/^#/, "")).filter(Boolean))];
}

export function fixedContentParts(content) {
  const divider = String(content || "").indexOf("=");
  if (divider < 0) return { label: String(content || "").trim(), value: "" };
  return { label: String(content).slice(0, divider).trim(), value: String(content).slice(divider + 1).trim() };
}

export function hasFixedContent(content) {
  const { label, value } = fixedContentParts(content);
  if (!label || !value) return false;
  return !/^(kg|cm|mm|ml|l|步|steps?)$/i.test(value.replace(/\s+/g, ""));
}

const EMPTY_TEMPLATE_NAMES = new Set(["", "untitled template", "未命名模板"]);
const EMPTY_TEMPLATE_FIELD_TEXT = new Set(["content", "record content", "new field", "内容", "记录内容", "新字段"]);

export function hasTemplateContent(item) {
  if (!item || typeof item !== "object") return false;
  const name = String(item.name || "").trim().toLowerCase();
  if (!EMPTY_TEMPLATE_NAMES.has(name)) return true;
  if (String(item.prompt || "").trim() || String(item.skeleton || "").trim()) return true;
  if (sanitizeTags(item.tags).length) return true;
  return (Array.isArray(item.fields) ? item.fields : []).some((templateField) => {
    const label = String(templateField?.label || "").trim().toLowerCase();
    const placeholder = String(templateField?.placeholder || "").trim().toLowerCase();
    const options = Array.isArray(templateField?.options) ? templateField.options.filter((option) => String(option).trim()) : [];
    return (label && !EMPTY_TEMPLATE_FIELD_TEXT.has(label)) || (placeholder && !EMPTY_TEMPLATE_FIELD_TEXT.has(placeholder)) || options.length > 0;
  });
}

function normalizeTemplateFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.filter((item) => item && item.id && item.label).map((item) => ({
    id: String(item.id),
    label: String(item.label).trim(),
    type: FIELD_TYPES.has(item.type) ? item.type : "text",
    options: Array.isArray(item.options) ? item.options.map((option) => String(option).trim()).filter(Boolean) : [],
    placeholder: String(item.placeholder || ""),
    required: Boolean(item.required)
  }));
}

export function composeTemplateContent(item, fieldValues = {}) {
  return (item.fields || []).map((templateField) => {
    const value = String(fieldValues[templateField.id] ?? "").trim();
    if (!value) return "";
    if (templateField.id === "content" || templateField.label === "内容" || templateField.label === "Content") return value;
    const separator = /[\u3400-\u9fff]/.test(templateField.label) ? "：" : ": ";
    return `${templateField.label}${separator}${value}`;
  }).filter(Boolean).join("；");
}

function normalizeSchedule(schedule, recordType) {
  if (recordType !== "periodic") return null;
  const source = schedule && typeof schedule === "object" ? schedule : {};
  const cadence = CADENCES.has(source.cadence) ? source.cadence : "daily";
  if (cadence === "timepoint") {
    const time = /^([01]\d|2[0-3]):[0-5]\d$/.test(source.time) ? source.time : "08:00";
    return { cadence, time };
  }
  if (cadence === "weekly") {
    const weekday = Number.isInteger(Number(source.weekday)) && Number(source.weekday) >= 0 && Number(source.weekday) <= 6 ? Number(source.weekday) : 1;
    return { cadence, weekday };
  }
  return { cadence: "daily" };
}

function normalizeMarkdownSettings(settings) {
  const candidate = settings && typeof settings === "object" ? settings : {};
  const normalized = { ...DEFAULT_MARKDOWN_SETTINGS };
  normalized.layout = candidate.layout === "timeline" ? "timeline" : "grouped";
  normalized.domainHeading = typeof candidate.domainHeading === "string"
    ? candidate.domainHeading
    : (typeof candidate.parentHeading === "string" ? candidate.parentHeading : normalized.domainHeading);
  normalized.categoryHeading = typeof candidate.categoryHeading === "string"
    ? candidate.categoryHeading
    : (typeof candidate.childHeading === "string" ? candidate.childHeading : normalized.categoryHeading);
  ["entryLine", "allDayHeading", "daySeparator"].forEach((key) => {
    if (typeof candidate[key] === "string") normalized[key] = candidate[key];
  });
  return normalized;
}

const LEGACY_CATEGORY_MAP = {
  daily: { domainId: "daily-domain", domainName: "日常", name: "记录" },
  "health-fixed": { domainId: "health-domain", domainName: "健康", name: "身体指标" },
  "health-food": { domainId: "health-domain", domainName: "健康", name: "饮食" },
  "health-rest": { domainId: "health-domain", domainName: "健康", name: "作息与恢复" },
  study: { domainId: "learning-domain", domainName: "学习", name: "学习记录" },
  trading: { domainId: "trading-domain", domainName: "交易", name: "市场" }
};

const LEGACY_BUILTIN_TEMPLATE_NAMES = {
  quick: new Set(["随手记", "Quick note"]),
  meal: new Set(["饮食", "Meal", "饮食记录", "Meal log"]),
  rest: new Set(["作息", "Recovery", "恢复事件", "Recovery event"]),
  learn: new Set(["学习", "Learning"]),
  market: new Set(["市场观察", "Market watch"])
};

function legacyParts(category) {
  const known = LEGACY_CATEGORY_MAP[String(category.id)];
  if (known) return known;
  const parts = String(category.name || "").split("·").map((part) => part.trim()).filter(Boolean);
  if (parts.length > 1) return { domainId: `domain-${String(category.id)}`, domainName: parts[0], name: parts.slice(1).join(" · ") };
  return { domainId: "other-domain", domainName: "其他", name: parts[0] || "未分类" };
}

function migrateLegacyStructure(candidate) {
  const domains = DEFAULT_DOMAINS.map((item) => ({ ...item }));
  const domainIds = new Set(domains.map((item) => item.id));
  const categoryOrders = new Map();
  const categories = candidate.categories.filter((item) => item && item.id && item.name).map((item) => {
    const parts = legacyParts(item);
    if (!domainIds.has(parts.domainId)) {
      domains.push({ id: parts.domainId, name: parts.domainName, order: domains.length });
      domainIds.add(parts.domainId);
    }
    const nextOrder = categoryOrders.get(parts.domainId) || 0;
    categoryOrders.set(parts.domainId, nextOrder + 1);
    return { id: String(item.id), domainId: parts.domainId, name: parts.name, order: nextOrder };
  });
  return { domains, categories };
}

function inferLegacyTemplateId(entry) {
  if (entry.templateId && entry.templateId !== "universal") return String(entry.templateId);
  if (entry.categoryId === "daily") return "quick";
  if (entry.categoryId === "health-food") return "meal";
  if (entry.categoryId === "study") return "learn";
  if (entry.categoryId === "trading") return "market";
  if (entry.categoryId === "health-rest") return /睡眠|起床/.test(String(entry.content)) ? "sleep" : "rest";
  if (entry.categoryId === "health-fixed") {
    const label = fixedContentParts(entry.content).label;
    return ({ 晨重: "morning-weight", 晚重: "evening-weight", 腰围: "waist", 异常: "health-abnormal", 日均步数: "steps" })[label] || null;
  }
  return entry.templateId ? String(entry.templateId) : null;
}

function assertUniqueIds(items, label) {
  const ids = new Set();
  items.forEach((item) => {
    if (ids.has(item.id)) throw new Error(`The backup contains duplicate ${label} IDs`);
    ids.add(item.id);
  });
}

/** Upgrades and validates external state once while preserving raw record content. */
export function normalizeState(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("The backup is not a valid object");
  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.templates) || !Array.isArray(candidate.entries)) {
    throw new Error("The backup is missing categories, templates, or records");
  }

  const legacy = !Array.isArray(candidate.domains) || Number(candidate.structureSchemaVersion) < STRUCTURE_SCHEMA_VERSION;
  const migrated = legacy ? migrateLegacyStructure(candidate) : { domains: candidate.domains, categories: candidate.categories };
  const domains = sortByOrder(migrated.domains.filter((item) => item && item.id && item.name).map((item, index) => ({
    id: String(item.id), name: String(item.name).trim(), order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
  })));
  if (!domains.length) throw new Error("The backup must contain at least one domain");
  assertUniqueIds(domains, "domain");
  const domainIds = new Set(domains.map((item) => item.id));
  const categories = sortByOrder(migrated.categories.filter((item) => item && item.id && item.name).map((item, index) => ({
    id: String(item.id),
    domainId: domainIds.has(String(item.domainId)) ? String(item.domainId) : domains[0].id,
    name: String(item.name).trim(),
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
  })));
  if (!categories.length) throw new Error("The backup must contain at least one category");
  assertUniqueIds(categories, "category");
  const categoryIds = new Set(categories.map((item) => item.id));
  const defaultsById = new Map(DEFAULT_TEMPLATES.map((item) => [item.id, item]));

  const existingTemplates = candidate.templates.filter((item) => item?.id !== "universal");
  const existingTemplateIds = new Set(existingTemplates.map((item) => item.id));
  const sourceTemplates = legacy ? [
    ...existingTemplates,
    ...DEFAULT_TEMPLATES.filter((item) => categoryIds.has(item.categoryId) && !existingTemplateIds.has(item.id))
  ] : candidate.templates;
  const orderByCategory = new Map();
  const templates = sourceTemplates.filter((item) => item && item.id && item.name && item.id !== "universal").map((item) => {
    const id = String(item.id);
    const defaults = defaultsById.get(id);
    const fields = normalizeTemplateFields(Array.isArray(item.fields) ? item.fields : defaults?.fields);
    const categoryId = categoryIds.has(String(item.categoryId)) ? String(item.categoryId) : categories[0].id;
    const fallbackOrder = orderByCategory.get(categoryId) || 0;
    orderByCategory.set(categoryId, fallbackOrder + 1);
    const recordType = RECORD_TYPES.has(item.recordType) ? item.recordType : (defaults?.recordType || "linear");
    const inputMode = INPUT_MODES.has(item.inputMode) ? item.inputMode : (defaults?.inputMode || (fields.length ? "structured" : "free"));
    const rawName = String(item.name).trim();
    const canonicalName = defaults && LEGACY_BUILTIN_TEMPLATE_NAMES[id]?.has(rawName) ? defaults.name : rawName;
    return {
      id,
      name: canonicalName,
      categoryId,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : fallbackOrder,
      recordType,
      schedule: normalizeSchedule(item.schedule || defaults?.schedule, recordType),
      homeVisible: item.homeVisible !== false,
      inputMode,
      tags: sanitizeTags(item.tags ?? defaults?.tags),
      prompt: String(item.prompt ?? defaults?.prompt ?? ""),
      skeleton: String(item.skeleton || ""),
      fields
    };
  });
  assertUniqueIds(templates, "template");
  const templateIds = new Set(templates.map((item) => item.id));
  const templatesById = new Map(templates.map((item) => [item.id, item]));

  const entries = candidate.entries.filter((item) => item && item.id && item.date && item.content !== undefined).map((item, index) => {
    const inferredTemplate = inferLegacyTemplateId(item);
    const templateId = inferredTemplate && templateIds.has(inferredTemplate) ? inferredTemplate : null;
    const categoryId = categoryIds.has(String(item.categoryId)) ? String(item.categoryId) : (templatesById.get(templateId)?.categoryId || categories[0].id);
    return {
      id: String(item.id), date: String(item.date), time: String(item.time || ""), content: String(item.content), categoryId,
      tags: sanitizeTags(item.tags), templateId,
      fieldValues: item.fieldValues && typeof item.fieldValues === "object" ? { ...item.fieldValues } : {},
      attachments: normalizeAttachmentRefs(item.attachments),
      source: item.source ? String(item.source) : null,
      sourceLine: item.sourceLine ? String(item.sourceLine) : null,
      createdAt: Number.isFinite(Number(item.createdAt)) ? Number(item.createdAt) : index
    };
  });
  assertUniqueIds(entries, "record");

  return {
    version: DATA_VERSION,
    structureSchemaVersion: STRUCTURE_SCHEMA_VERSION,
    seedVersion: Number(candidate.seedVersion) || 0,
    domains,
    categories,
    templates,
    markdownSettings: normalizeMarkdownSettings(candidate.markdownSettings),
    entries,
    planBlocks: normalizePlanBlocks(candidate.planBlocks)
  };
}

export function restoreState(candidate) {
  return ensureDailySeed(normalizeState(candidate));
}

function renderMarkdownTemplate(value, variables) {
  return value.replace(/\{\{(date|domain|category|time|content|tags)\}\}/g, (_, key) => variables[key] ?? "");
}

function entryLine(entry, settings, context = {}) {
  const tags = entry.tags.map((tag) => `#${tag}`).join(" ");
  return renderMarkdownTemplate(settings.entryLine, {
    date: entry.date,
    domain: context.domain || "",
    category: context.category || "",
    time: entry.time ? `${entry.time} ` : "",
    content: entry.content,
    tags: tags ? ` ${tags}` : ""
  });
}

function orderedEntries(state, entries) {
  const templateMap = new Map(state.templates.map((item) => [item.id, item]));
  return [...entries].sort((a, b) => {
    const aTemplate = templateMap.get(a.templateId);
    const bTemplate = templateMap.get(b.templateId);
    const aPeriodic = aTemplate?.recordType === "periodic" ? 0 : 1;
    const bPeriodic = bTemplate?.recordType === "periodic" ? 0 : 1;
    return aPeriodic - bPeriodic || (aPeriodic === 0 ? (aTemplate?.order || 0) - (bTemplate?.order || 0) : a.time.localeCompare(b.time)) || a.createdAt - b.createdAt;
  });
}

/** Renders one normalized date without repeating migration or validation work. */
function markdownForNormalizedDate(state, date) {
  const settings = state.markdownSettings;
  const entries = state.entries.filter((entry) => entry.date === date);
  if (settings.layout === "timeline") {
    if (!entries.length) return "";
    const categoryMap = new Map(state.categories.map((item) => [item.id, item]));
    const domainMap = new Map(state.domains.map((item) => [item.id, item]));
    return `${orderedEntries(state, entries).map((entry) => {
      const category = categoryMap.get(entry.categoryId);
      return entryLine(entry, settings, { category: category?.name, domain: domainMap.get(category?.domainId)?.name });
    }).join("\n").trim()}\n`;
  }

  const byCategory = new Map();
  entries.forEach((entry) => {
    if (!byCategory.has(entry.categoryId)) byCategory.set(entry.categoryId, []);
    byCategory.get(entry.categoryId).push(entry);
  });
  const lines = [];
  state.domains.forEach((domain) => {
    const categoryBlocks = state.categories.filter((item) => item.domainId === domain.id)
      .map((category) => ({ category, entries: orderedEntries(state, byCategory.get(category.id) || []) }))
      .filter((item) => item.entries.length);
    if (!categoryBlocks.length) return;
    lines.push(renderMarkdownTemplate(settings.domainHeading, { domain: domain.name, category: domain.name, date }), "");
    categoryBlocks.forEach(({ category, entries: categoryEntries }) => {
      lines.push(renderMarkdownTemplate(settings.categoryHeading, { domain: domain.name, category: category.name, date }), "");
      lines.push(...categoryEntries.map((entry) => entryLine(entry, settings, { domain: domain.name, category: category.name })), "");
    });
  });
  return lines.length ? `${lines.join("\n").trim()}\n` : "";
}

export function markdownForDate(rawState, date) {
  return markdownForNormalizedDate(normalizeState(rawState), date);
}

export function markdownForAll(rawState) {
  const state = normalizeState(rawState);
  const settings = state.markdownSettings;
  const dates = [...new Set(state.entries.map((entry) => entry.date))].sort();
  if (!dates.length) return "# Log Note\n\nNo records yet.\n";
  const daySeparator = settings.daySeparator.trim();
  const separator = daySeparator ? `\n\n${daySeparator}\n\n` : "\n\n";
  return dates.map((date) => {
    const heading = renderMarkdownTemplate(settings.allDayHeading, { date });
    return [heading, markdownForNormalizedDate(state, date).trim()].filter(Boolean).join("\n\n");
  }).join(separator) + "\n";
}

function structureObject(rawState) {
  const state = normalizeState(rawState);
  return {
    schemaVersion: STRUCTURE_SCHEMA_VERSION,
    app: { name: "Log Note", locale: "en" },
    domains: state.domains,
    categories: state.categories,
    templates: sortByOrder(state.templates),
    markdownSettings: state.markdownSettings
  };
}

export function structurePayload(state) {
  return JSON.stringify(structureObject(state), null, 2);
}

/** Returns a complete editable example of every supported structure capability. */
export function generalStructureTemplate() {
  return JSON.stringify({
    schemaVersion: STRUCTURE_SCHEMA_VERSION,
    app: { name: "Log Note", locale: "en" },
    domains: [{ id: "example-domain", name: "Example domain", order: 0 }],
    categories: [
      { id: "notes", domainId: "example-domain", name: "Notes", order: 0 },
      { id: "reflections", domainId: "example-domain", name: "Reflections", order: 1 },
      { id: "metrics", domainId: "example-domain", name: "Metrics", order: 2 }
    ],
    templates: [
      {
        id: "quick-note", name: "Quick note", categoryId: "notes", order: 0,
        recordType: "linear", schedule: null, inputMode: "free", tags: ["note"],
        prompt: "What happened? Add a result or next step if useful.", skeleton: "Observation:\nResult:\nNext:", fields: []
      },
      {
        id: "structured-reflection", name: "Structured reflection", categoryId: "reflections", order: 0,
        recordType: "linear", schedule: null, inputMode: "structured", tags: ["reflection"],
        prompt: "Capture the observation first, then decide what happens next.", skeleton: "",
        fields: [
          { id: "observation", label: "Observation", type: "textarea", options: [], placeholder: "What happened or changed?", required: true },
          { id: "context", label: "Context", type: "text", options: [], placeholder: "Where or under what condition?", required: false },
          { id: "signal", label: "Signal", type: "select", options: ["Positive", "Neutral", "Negative"], placeholder: "", required: false },
          { id: "score", label: "Confidence", type: "rating", options: [], placeholder: "", required: false },
          { id: "amount", label: "Measured value", type: "number", options: [], placeholder: "Optional number", required: false }
        ]
      },
      {
        id: "daily-check", name: "Daily value", categoryId: "metrics", order: 0,
        recordType: "periodic", schedule: { cadence: "daily" }, homeVisible: true, inputMode: "value", tags: [],
        prompt: "Enter today's value and unit.", skeleton: "", fields: []
      },
      {
        id: "weekly-check", name: "Weekly check", categoryId: "reflections", order: 1,
        recordType: "periodic", schedule: { cadence: "weekly", weekday: 1 }, homeVisible: true, inputMode: "structured", tags: ["weekly"],
        prompt: "Review the week and choose one next step.", skeleton: "",
        fields: [{ id: "weekly-note", label: "Weekly note", type: "textarea", options: [], placeholder: "What should continue or change?", required: true }]
      },
      {
        id: "morning-check", name: "Morning check", categoryId: "metrics", order: 1,
        recordType: "periodic", schedule: { cadence: "timepoint", time: "08:00" }, inputMode: "value", tags: [],
        prompt: "Enter the morning value.", skeleton: "", fields: []
      }
    ],
    markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS }
  }, null, 2);
}

export function backupPayload(rawState) {
  const state = normalizeState(rawState);
  return JSON.stringify({ ...state, version: DATA_VERSION, exportedAt: new Date().toISOString() }, null, 2);
}
