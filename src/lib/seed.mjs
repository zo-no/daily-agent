/**
 * @fileoverview 将只读日记原文转换为首次启动时导入的记录。
 */

export const DAILY_SEED_VERSION = 1;

const DAILY_SEED_DATE = "2026-08-11";
const SOURCE_RECORDS = [
  { categoryId: "daily", line: "- 08:28 出发上班。" },
  { categoryId: "daily", line: "- 09:29 整理今日待办中。" },
  { categoryId: "daily", line: "- 11:13 迭代记录模版中，避免混乱了。这样我也想到了一个app的雏形，记录自己的一天有哪些有意思的新方法。纯净打卡+AI拟合+健康监控。" },
  { categoryId: "daily", line: "- 11:20 先把模版做出来，黑客松的思路也做出来了。" },
  { categoryId: "daily", line: "- 11:28 舒服了，接下来我们就可以做新产品了logger日记？我们需要有个更好的名字，但这个记录方案肯定已经固定了，哪怕是做给自己也是合适的。" },
  { categoryId: "daily", line: "- 11:37  现在开始做一下报告" },
  { categoryId: "daily", line: "- 12:55 开始控糖。" },
  { categoryId: "daily", line: "- 13:02 " },
  { categoryId: "health-fixed", line: "- 晨重=66.95kg" },
  { categoryId: "health-fixed", line: "- 晚重=kg" },
  { categoryId: "health-fixed", line: "- 异常=无" },
  { categoryId: "health-fixed", line: "- 腰围=cm" },
  { categoryId: "health-fixed", line: "- 日均步数=" },
  { categoryId: "health-food", line: "- 早餐：绿豆粥、玉米饼、茶叶蛋；胃肠负担：中；饭后反馈：肠鸣。" },
  { categoryId: "health-food", line: "- 午餐：南瓜粥。" },
  { categoryId: "health-rest", line: "- 08:00 起床；昨日睡眠 8h；睡眠质量 4 / 5。" },
  { categoryId: "health-rest", line: "- 10:17 喝水吃药 1杯/350ml" },
  { categoryId: "trading", line: "- 10:19 今日市场分化开始，考虑是否撤资等过两个小时后看看" }
];

function parseSourceLine(line) {
  const body = line.slice(2);
  const timed = body.match(/^(\d{2}:\d{2}) (.*)$/s);
  if (!timed) return { time: "", content: body };
  return { time: timed[1], content: timed[2] };
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
      templateId: null,
      fieldValues: {},
      source: "2026_08_11.md",
      sourceLine: record.line,
      createdAt: 1786406400000 + index,
      updatedAt: 1786406400000 + index
    };
  });
}

export function ensureDailySeed(state) {
  if (state.seedVersion >= DAILY_SEED_VERSION) return state;
  const existingIds = new Set(state.entries.map((entry) => entry.id));
  const missing = createDailySeedEntries().filter((entry) => !existingIds.has(entry.id));
  return { ...state, seedVersion: DAILY_SEED_VERSION, entries: [...state.entries, ...missing] };
}
