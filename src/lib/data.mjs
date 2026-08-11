/**
 * @fileoverview 定义本地记录数据、备份恢复与 Markdown 导出规则。
 */

export const STORAGE_KEY = "log-note:data:v1";

const DEFAULT_CATEGORIES = [
  { id: "daily", name: "日常记录" },
  { id: "health-fixed", name: "健康 · 固定记录" },
  { id: "health-food", name: "健康 · 饮食节奏" },
  { id: "health-rest", name: "健康 · 作息与恢复" },
  { id: "study", name: "学习" },
  { id: "trading", name: "交易 · 今日观察" }
];

const DEFAULT_TEMPLATES = [
  {
    id: "quick",
    name: "随手记",
    categoryId: "daily",
    tags: [],
    prompt: "做了什么？必要时补充结果、状态或下一步。",
    skeleton: ""
  },
  {
    id: "meal",
    name: "饮食",
    categoryId: "health-food",
    tags: ["饮食"],
    prompt: "记录吃了什么、胃肠负担和饭后反馈。",
    skeleton: "午餐：；胃肠负担：低 / 中 / 高；饭后反馈："
  },
  {
    id: "rest",
    name: "作息",
    categoryId: "health-rest",
    tags: ["作息"],
    prompt: "记录起床、入睡、饮水或恢复情况。",
    skeleton: "起床 / 入睡 / 饮水：；状态："
  },
  {
    id: "learn",
    name: "学习",
    categoryId: "study",
    tags: ["学习"],
    prompt: "学了什么？使用了什么材料？有什么输出或后续动作？",
    skeleton: "学习；材料：；收获：；下一步："
  },
  {
    id: "market",
    name: "市场观察",
    categoryId: "trading",
    tags: ["交易"],
    prompt: "观察到什么？当前判断是什么？何时重新检查？",
    skeleton: "观察：；判断：；下次检查："
  }
];

export function createInitialState() {
  return {
    version: 1,
    categories: DEFAULT_CATEGORIES.map((item) => ({ ...item })),
    templates: DEFAULT_TEMPLATES.map((item) => ({ ...item, tags: [...item.tags] })),
    entries: []
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

  return {
    version: 1,
    categories,
    templates: candidate.templates
      .filter((item) => item && item.id && item.name)
      .map((item) => ({
        id: String(item.id),
        name: String(item.name).trim(),
        categoryId: categoryIds.has(item.categoryId) ? item.categoryId : categories[0].id,
        tags: sanitizeTags(item.tags),
        prompt: String(item.prompt || ""),
        skeleton: String(item.skeleton || "")
      })),
    entries: candidate.entries
      .filter((item) => item && item.id && item.date && item.content)
      .map((item) => ({
        id: String(item.id),
        date: String(item.date),
        time: String(item.time || "00:00"),
        content: String(item.content).trim(),
        categoryId: categoryIds.has(item.categoryId) ? item.categoryId : categories[0].id,
        tags: sanitizeTags(item.tags),
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
  return `- ${entry.time} ${entry.content}${tags ? ` ${tags}` : ""}`;
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
