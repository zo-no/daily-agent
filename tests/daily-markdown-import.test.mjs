import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import {
  mergeDailyMarkdownEntries,
  parseDailyMarkdown,
  parseDailyMarkdownFiles
} from "../src/lib/daily-markdown-import.mjs";

const markdown = `00:03 睡觉吧。
06:40醒了睡不着了。

## 日常记录

- HH:MM 做了什么；必要时补充结果、状态或下一步。
> [!example]- 示例
> - 08:28 出发上班。
21:36 开完会了，现在两件事：
1. 先理清需求。
2. 回家。

## 健康
### 固定记录
- 晨重=66.15kg
- 晚重=kg

#### 饮食节奏
- 09:45 早餐小米粥1碗，茶叶蛋x1
参考字段：主食 / 蛋白 / 蔬菜

#### 作息与恢复
- 可能睡了6.5h

## 交易
### 今日观察
10:13 银行一直跌，科技一直涨。
微信：
84.01+358.87+1010.25
`;

test("日记 Markdown 只保留真实正文、时间和多行记录", () => {
  assert.deepEqual(parseDailyMarkdown("2026_08_12.md", markdown), [
    { date: "2026-08-12", time: "00:03", content: "睡觉吧。" },
    { date: "2026-08-12", time: "06:40", content: "醒了睡不着了。" },
    { date: "2026-08-12", time: "21:36", content: "开完会了，现在两件事：\n1. 先理清需求。\n2. 回家。" },
    { date: "2026-08-12", time: "09:45", content: "早餐小米粥1碗，茶叶蛋x1" },
    { date: "2026-08-12", time: "", content: "可能睡了6.5h" },
    { date: "2026-08-12", time: "10:13", content: "银行一直跌，科技一直涨。" }
  ]);
});

test("支持两种规范文件名并拒绝无效日期", () => {
  assert.equal(parseDailyMarkdown("2026-08-13.md", "09:00 上班")[0].date, "2026-08-13");
  assert.throws(() => parseDailyMarkdown("daily.md", "09:00 上班"), /YYYY_MM_DD/);
  assert.throws(() => parseDailyMarkdown("2026_02_30.md", "09:00 上班"), /invalid date/);
});

test("空模板不会产生记录，多文件保持输入顺序", () => {
  const templateOnly = "## 日常记录\n- HH:MM 做了什么；必要时补充结果、状态或下一步。\n> - 08:28 示例";
  assert.deepEqual(parseDailyMarkdown("2026_08_18.md", templateOnly), []);
  assert.deepEqual(parseDailyMarkdownFiles([
    { name: "2026_08_16.md", text: "09:00 第一条" },
    { name: "2026_08_17.md", text: "10:00 第二条" }
  ]).map((entry) => entry.content), ["第一条", "第二条"]);
});

test("合并导入保留现有状态、使用普通记录并保持幂等", () => {
  const state = createInitialState();
  const originalEntries = state.entries;
  const candidates = [
    { date: "2026-08-17", time: "09:00", content: "开始上班" },
    { date: "2026-08-17", time: "09:00", content: "开始上班" },
    { date: "2026-08-17", time: "10:00", content: "继续工作" }
  ];
  let id = 0;
  const first = mergeDailyMarkdownEntries(state, candidates, () => `import-${++id}`);
  assert.equal(first.imported.length, 2);
  assert.equal(first.skipped, 1);
  assert.equal(state.entries, originalEntries);
  assert.deepEqual(first.imported.map((entry) => ({
    categoryId: entry.categoryId,
    templateId: entry.templateId,
    tags: entry.tags,
    fieldValues: entry.fieldValues,
    attachments: entry.attachments
  })), [
    { categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, attachments: [] },
    { categoryId: "daily", templateId: "quick", tags: [], fieldValues: {}, attachments: [] }
  ]);

  const second = mergeDailyMarkdownEntries(first.state, candidates, () => `import-${++id}`);
  assert.equal(second.imported.length, 0);
  assert.equal(second.skipped, 3);
  assert.equal(second.state, first.state);
});
