/**
 * @fileoverview 将只读日记原文转换为首次启动时导入的记录。
 */

export const DAILY_SEED_VERSION = 3;

const DAILY_SEED_DATE = "2026-08-11";
const SOURCE_RECORDS = [
  { categoryId: "daily", templateId: "quick", line: "- 08:28 出发上班。" },
  { categoryId: "daily", templateId: "quick", line: "- 09:29 整理今日待办中。" },
  { categoryId: "daily", templateId: "quick", line: "- 11:13 迭代记录模版中，避免混乱了。这样我也想到了一个app的雏形，记录自己的一天有哪些有意思的新方法。纯净打卡+AI拟合+健康监控。" },
  { categoryId: "daily", templateId: "quick", line: "- 11:20 先把模版做出来，黑客松的思路也做出来了。" },
  { categoryId: "daily", templateId: "quick", line: "- 11:28 舒服了，接下来我们就可以做新产品了logger日记？我们需要有个更好的名字，但这个记录方案肯定已经固定了，哪怕是做给自己也是合适的。" },
  { categoryId: "daily", templateId: "quick", line: "- 11:37  现在开始做一下报告" },
  { categoryId: "daily", templateId: "quick", line: "- 12:55 开始控糖。" },
  { categoryId: "daily", templateId: "quick", line: "- 13:02 " },
  { categoryId: "health-fixed", templateId: "morning-weight", line: "- 晨重=66.95kg" },
  { categoryId: "health-fixed", templateId: "evening-weight", line: "- 晚重=kg" },
  { categoryId: "health-fixed", templateId: "health-abnormal", line: "- 异常=无" },
  { categoryId: "health-fixed", templateId: "waist", line: "- 腰围=cm" },
  { categoryId: "health-fixed", templateId: "steps", line: "- 日均步数=" },
  { categoryId: "health-food", templateId: "meal", line: "- 早餐：绿豆粥、玉米饼、茶叶蛋；胃肠负担：中；饭后反馈：肠鸣。" },
  { categoryId: "health-food", templateId: "meal", line: "- 午餐：南瓜粥。" },
  { categoryId: "health-rest", templateId: "sleep", line: "- 08:00 起床；昨日睡眠 8h；睡眠质量 4 / 5。" },
  { categoryId: "health-rest", templateId: "rest", line: "- 10:17 喝水吃药 1杯/350ml" },
  { categoryId: "trading", templateId: "market", line: "- 10:19 今日市场分化开始，考虑是否撤资等过两个小时后看看" }
];

function parseSourceLine(line) {
  const body = line.slice(2);
  const timed = body.match(/^(\d{2}:\d{2}) (.*)$/s);
  if (!timed) return { time: "", content: body };
  return { time: timed[1], content: timed[2] };
}

function hasSeedContent(entry) {
  if (!entry.content.trim()) return false;
  if (entry.categoryId !== "health-fixed") return true;
  const divider = entry.content.indexOf("=");
  const label = divider < 0 ? entry.content.trim() : entry.content.slice(0, divider).trim();
  const value = divider < 0 ? "" : entry.content.slice(divider + 1).trim();
  return Boolean(label && value && !/^(kg|cm|mm|ml|l|步|steps?)$/i.test(value.replace(/\s+/g, "")));
}

export function createDailySeedEntries() {
  return SOURCE_RECORDS.map((record, index) => {
    const parsed = parseSourceLine(record.line);
    return {
      id: `seed-${DAILY_SEED_DATE}-${String(index + 1).padStart(2, "0")}`,
      date: DAILY_SEED_DATE,
      time: parsed.time,
      content: parsed.content,
      categoryId: record.categoryId,
      tags: [],
      templateId: record.templateId,
      fieldValues: {},
      source: "2026_08_11.md",
      sourceLine: record.line,
      createdAt: 1786406400000 + index
    };
  }).filter(hasSeedContent);
}

export function ensureDailySeed(state) {
  if (state.seedVersion >= DAILY_SEED_VERSION) return state;
  const entries = state.entries.filter((entry) => !entry.id.startsWith(`seed-${DAILY_SEED_DATE}-`) || hasSeedContent(entry));
  const categoryIds = new Set(state.categories.map((item) => item.id));
  const templateIds = new Set(state.templates.map((item) => item.id));
  const dailySeedEntries = createDailySeedEntries().filter((entry) => categoryIds.has(entry.categoryId) && templateIds.has(entry.templateId));
  const canonical = new Map(dailySeedEntries.map((entry) => [entry.id, entry]));
  const migrated = entries.map((entry) => {
    const seed = canonical.get(entry.id);
    return seed ? { ...entry, templateId: seed.templateId, categoryId: seed.categoryId } : entry;
  });
  const existingIds = new Set(migrated.map((entry) => entry.id));
  const missing = dailySeedEntries.filter((entry) => !existingIds.has(entry.id));
  return { ...state, seedVersion: DAILY_SEED_VERSION, entries: [...migrated, ...missing] };
}
