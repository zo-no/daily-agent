/**
 * @fileoverview 定义本地记录数据、备份恢复与 Markdown 导出规则。
 */

import { DAILY_SEED_VERSION, createDailySeedEntries } from "./seed.mjs";

export const STORAGE_KEY = "log-note:data:v1";

const DEFAULT_CATEGORIES = [
  { id: "daily", name: "日常记录" },
  { id: "health-fixed", name: "健康 · 固定记录" },
  { id: "health-food", name: "健康 · 饮食节奏" },
  { id: "health-rest", name: "健康 · 作息与恢复" },
  { id: "study", name: "学习" },
  { id: "trading", name: "交易 · 今日观察" }
];

const FIELD_TYPES = new Set(["text", "textarea", "number", "select", "rating"]);
const TEMPLATE_SCHEMA_VERSION = 1;

const field = (id, label, type = "text", options = [], placeholder = "", required = false) => ({
  id,
  label,
  type,
  options,
  placeholder,
  required
});

const cloneTemplate = (template) => ({
  ...template,
  tags: [...template.tags],
  fields: template.fields.map((templateField) => ({ ...templateField, options: [...templateField.options] }))
});

const DEFAULT_TEMPLATES = [
  {
    id: "quick",
    name: "随手记",
    categoryId: "daily",
    tags: [],
    prompt: "做了什么？必要时补充结果、状态或下一步。",
    skeleton: "",
    fields: []
  },
  {
    id: "universal",
    name: "万能记录",
    categoryId: "daily",
    tags: [],
    prompt: "先写事实，其他信息可以稍后补充。",
    skeleton: "",
    fields: [
      field("content", "内容", "textarea", [], "发生了什么？", true),
      field("status", "状态", "select", ["进行中", "已完成", "暂停"]),
      field("next", "下一步", "text", [], "接下来准备做什么？")
    ]
  },
  {
    id: "meal",
    name: "饮食",
    categoryId: "health-food",
    tags: ["饮食"],
    prompt: "记录吃了什么、胃肠负担和饭后反馈。",
    skeleton: "",
    fields: [
      field("meal", "餐次", "select", ["早餐", "午餐", "晚餐", "加餐"], "", true),
      field("food", "吃了什么", "text", [], "食物和饮品", true),
      field("load", "胃肠负担", "select", ["低", "中", "高"]),
      field("feedback", "饭后反馈", "text", [], "无明显不适")
    ]
  },
  {
    id: "rest",
    name: "作息",
    categoryId: "health-rest",
    tags: ["作息"],
    prompt: "记录起床、入睡、饮水或恢复情况。",
    skeleton: "",
    fields: [
      field("event", "事件", "select", ["起床", "入睡", "午休", "饮水", "排便", "恢复"]),
      field("detail", "记录", "text", [], "时长、饮水量或身体反馈", true),
      field("energy", "精力", "rating")
    ]
  },
  {
    id: "learn",
    name: "学习",
    categoryId: "study",
    tags: ["学习"],
    prompt: "学了什么？使用了什么材料？有什么输出或后续动作？",
    skeleton: "",
    fields: [
      field("topic", "学习内容", "text", [], "学了什么？", true),
      field("material", "材料", "text", [], "课程、书或文章"),
      field("gain", "收获", "textarea", [], "记下一条最重要的收获"),
      field("next", "下一步", "text")
    ]
  },
  {
    id: "market",
    name: "市场观察",
    categoryId: "trading",
    tags: ["交易"],
    prompt: "观察到什么？当前判断是什么？何时重新检查？",
    skeleton: "",
    fields: [
      field("observation", "观察", "textarea", [], "市场发生了什么？", true),
      field("judgement", "判断", "text", [], "当前判断"),
      field("next", "下次检查", "text", [], "时间或触发条件")
    ]
  }
];

export function createInitialState() {
  return {
    version: 1,
    seedVersion: DAILY_SEED_VERSION,
    templateSchemaVersion: TEMPLATE_SCHEMA_VERSION,
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    templates: DEFAULT_TEMPLATES.map(cloneTemplate),
    entries: createDailySeedEntries()
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

function normalizeTemplateFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields
    .filter((item) => item && item.id && item.label)
    .map((item) => ({
      id: String(item.id),
      label: String(item.label).trim(),
      type: FIELD_TYPES.has(item.type) ? item.type : "text",
      options: Array.isArray(item.options) ? item.options.map((option) => String(option).trim()).filter(Boolean) : [],
      placeholder: String(item.placeholder || ""),
      required: Boolean(item.required)
    }));
}

export function composeTemplateContent(template, fieldValues = {}) {
  return template.fields
    .map((templateField) => {
      const raw = fieldValues[templateField.id];
      const value = String(raw ?? "").trim();
      if (!value) return "";
      return templateField.label === "内容" ? value : `${templateField.label}：${value}`;
    })
    .filter(Boolean)
    .join("；");
}

export function ensureTemplateSchema(state) {
  if (state.templateSchemaVersion >= TEMPLATE_SCHEMA_VERSION) return state;
  const templateIds = new Set(state.templates.map((template) => template.id));
  const additions = DEFAULT_TEMPLATES
    .filter((template) => template.id === "universal" && !templateIds.has(template.id))
    .map(cloneTemplate);
  const templates = [...state.templates];
  const insertAt = Math.max(0, templates.findIndex((template) => template.id === "quick") + 1);
  templates.splice(insertAt, 0, ...additions);
  return { ...state, templateSchemaVersion: TEMPLATE_SCHEMA_VERSION, templates };
}

export function normalizeState(candidate) {
  if (!candidate || typeof candidate !== "object") throw new Error("备份文件不是有效对象");
  if (!Array.isArray(candidate.categories) || !Array.isArray(candidate.templates) || !Array.isArray(candidate.entries)) {
    throw new Error("备份缺少分类、模板或记录数据");
  }

  const categories = candidate.categories
    .filter((item) => item && item.id && item.name)
    .map((item) => ({ id: String(item.id), name: String(item.name).trim() }));
  if (!categories.length) throw new Error("备份中至少需要一个分类");
  const categoryIds = new Set(categories.map((item) => item.id));
  const defaultsById = new Map(DEFAULT_TEMPLATES.map((item) => [item.id, item]));

  return {
    version: 1,
    seedVersion: Number(candidate.seedVersion) || 0,
    templateSchemaVersion: Number(candidate.templateSchemaVersion) || 0,
    categories,
    templates: candidate.templates
      .filter((item) => item && item.id && item.name)
      .map((item) => {
        const defaultTemplate = defaultsById.get(String(item.id));
        return {
          id: String(item.id),
          name: String(item.name).trim(),
          categoryId: categoryIds.has(item.categoryId) ? item.categoryId : categories[0].id,
          tags: sanitizeTags(item.tags),
          prompt: String(item.prompt || defaultTemplate?.prompt || ""),
          skeleton: String(item.skeleton || ""),
          fields: normalizeTemplateFields(Array.isArray(item.fields) ? item.fields : defaultTemplate?.fields)
        };
      }),
    entries: candidate.entries
      .filter((item) => item && item.id && item.date && item.content !== undefined)
      .map((item) => ({
        id: String(item.id),
        date: String(item.date),
        time: String(item.time || ""),
        content: String(item.content),
        categoryId: categoryIds.has(item.categoryId) ? item.categoryId : categories[0].id,
        tags: sanitizeTags(item.tags),
        templateId: item.templateId ? String(item.templateId) : null,
        fieldValues: item.fieldValues && typeof item.fieldValues === "object" ? { ...item.fieldValues } : {},
        source: item.source ? String(item.source) : null,
        sourceLine: item.sourceLine ? String(item.sourceLine) : null,
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Number(item.updatedAt) || Number(item.createdAt) || Date.now()
      }))
  };
}

function parseCategoryName(name) {
  const parts = name.split("·").map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? { parent: parts[0], child: parts.slice(1).join(" · ") } : { parent: parts[0] || "未分类", child: null };
}

function entryLine(entry) {
  const tags = entry.tags.map((tag) => `#${tag}`).join(" ");
  const prefix = entry.time ? `${entry.time} ` : "";
  return `- ${prefix}${entry.content}${tags ? ` ${tags}` : ""}`;
}

export function markdownForDate(state, date) {
  const entries = state.entries
    .filter((entry) => entry.date === date)
    .sort((a, b) => a.time.localeCompare(b.time) || a.createdAt - b.createdAt);
  const byCategory = new Map();
  entries.forEach((entry) => {
    if (!byCategory.has(entry.categoryId)) byCategory.set(entry.categoryId, []);
    byCategory.get(entry.categoryId).push(entry);
  });

  const parents = [];
  state.categories.forEach((category) => {
    const categoryEntries = byCategory.get(category.id);
    if (!categoryEntries?.length) return;
    const parsed = parseCategoryName(category.name);
    let group = parents.find((item) => item.name === parsed.parent);
    if (!group) {
      group = { name: parsed.parent, direct: [], children: [] };
      parents.push(group);
    }
    if (parsed.child) group.children.push({ name: parsed.child, entries: categoryEntries });
    else group.direct.push(...categoryEntries);
  });

  if (!parents.length) return `## 日常记录\n\n`;
  const lines = [];
  parents.forEach((parent) => {
    lines.push(`## ${parent.name}`, "");
    if (parent.direct.length) lines.push(...parent.direct.map(entryLine), "");
    parent.children.forEach((child) => {
      lines.push(`### ${child.name}`, "", ...child.entries.map(entryLine), "");
    });
  });
  return `${lines.join("\n").trim()}\n`;
}

export function markdownForAll(state) {
  const dates = [...new Set(state.entries.map((entry) => entry.date))].sort();
  if (!dates.length) return "# Log Note\n\n暂无记录。\n";
  return dates.map((date) => `# ${date}\n\n${markdownForDate(state, date).trim()}`).join("\n\n---\n\n") + "\n";
}

export function backupPayload(state) {
  return JSON.stringify({ ...state, version: 1, exportedAt: new Date().toISOString() }, null, 2);
}
