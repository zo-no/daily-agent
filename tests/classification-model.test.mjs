import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOrganization,
  availableClassificationCategories,
  organizationSnapshot,
  organizeEntries,
  restoreOrganization
} from "../src/lib/classification-model.mjs";
import { createRuleClassifierProvider } from "../src/lib/classifier-provider.mjs";

const state = {
  domains: [
    { id: "daily-domain", name: "日常", order: 0 },
    { id: "health-domain", name: "健康", order: 1 },
    { id: "learning-domain", name: "学习", order: 2 },
    { id: "trading-domain", name: "交易", order: 3 }
  ],
  categories: [
    { id: "daily", domainId: "daily-domain", name: "记录", order: 0 },
    { id: "health-food", domainId: "health-domain", name: "饮食", order: 0 },
    { id: "health-rest", domainId: "health-domain", name: "作息与恢复", order: 1 },
    { id: "study", domainId: "learning-domain", name: "学习记录", order: 0 },
    { id: "trading", domainId: "trading-domain", name: "市场", order: 0 }
  ],
  templates: [
    { id: "quick", name: "随手记", categoryId: "daily", recordType: "linear", tags: [], prompt: "" },
    { id: "meal", name: "饮食记录", categoryId: "health-food", recordType: "linear", tags: ["饮食"], prompt: "吃了什么" },
    { id: "rest", name: "恢复事件", categoryId: "health-rest", recordType: "linear", tags: ["作息"], prompt: "睡眠与恢复" },
    { id: "learn", name: "学习", categoryId: "study", recordType: "linear", tags: ["学习"], prompt: "课程和读书" },
    { id: "market", name: "市场观察", categoryId: "trading", recordType: "linear", tags: ["交易"], prompt: "投资与市场" },
    { id: "daily-check", name: "每日检查", categoryId: "health-rest", recordType: "periodic", tags: [], prompt: "" }
  ],
  entries: [
    { id: "a", date: "2026-08-14", time: "09:00", content: "早餐吃了鸡蛋和豆浆", categoryId: "daily", templateId: "quick", tags: ["手工标签"], attachments: [{ id: "image-a" }], createdAt: 3 },
    { id: "b", date: "2026-08-13", time: "20:00", content: "复习 React 课程并整理笔记", categoryId: "study", templateId: "quick", tags: [], attachments: [], createdAt: 2 },
    { id: "c", date: "2026-08-08", time: "08:00", content: "市场分化，调整投资仓位", categoryId: "trading", templateId: "quick", tags: [], attachments: [], createdAt: 1 },
    { id: "d", date: "2026-08-14", time: "07:00", content: "睡眠=8h", categoryId: "health-rest", templateId: "daily-check", tags: [], attachments: [], createdAt: 4 }
  ]
};

test("整理只返回指定日期的普通记录并保持稳定时间顺序", () => {
  const entries = [
    ...state.entries,
    { ...state.entries[0], id: "e", time: "08:30", content: "同日较早记录", createdAt: 5 },
    { ...state.entries[0], id: "f", time: "09:00", content: "同一时间较新记录", createdAt: 6 }
  ];
  assert.deepEqual(organizeEntries({ entries, templates: state.templates, date: "2026-08-14" }).map((entry) => entry.id), ["f", "a", "e"]);
  assert.deepEqual(organizeEntries({ entries, templates: state.templates, date: "2026-08-13" }).map((entry) => entry.id), ["b"]);
  assert.deepEqual(organizeEntries({ entries, templates: state.templates, date: "2026-08-12" }), []);
  assert.deepEqual(organizeEntries({ entries, templates: state.templates, date: "2026-02-31" }), []);
});

test("分类候选只来自现有领域与分类，并携带稳定的领域路径和提示", () => {
  const categories = availableClassificationCategories(state);
  assert.deepEqual(categories.map(({ id, domainId, domainName, name }) => ({ id, domainId, domainName, name })), [
    { id: "daily", domainId: "daily-domain", domainName: "日常", name: "记录" },
    { id: "health-food", domainId: "health-domain", domainName: "健康", name: "饮食" },
    { id: "health-rest", domainId: "health-domain", domainName: "健康", name: "作息与恢复" },
    { id: "study", domainId: "learning-domain", domainName: "学习", name: "学习记录" },
    { id: "trading", domainId: "trading-domain", domainName: "交易", name: "市场" }
  ]);
  assert.ok(categories.find((item) => item.id === "health-food").hints.includes("饮食记录"));
  assert.ok(categories.find((item) => item.id === "trading").hints.includes("交易"));
});

test("本地 provider 每条记录只建议一个已有分类，当前分类与低置信记录保持不动", async () => {
  const categories = availableClassificationCategories(state);
  const result = await createRuleClassifierProvider().analyze({
    entries: [
      state.entries[0],
      { ...state.entries[0], id: "sleep", content: "昨晚很晚入睡，今天起床精神一般", tags: [] },
      { ...state.entries[0], id: "learn", content: "读完课程文章并整理学习笔记", tags: [] },
      { ...state.entries[0], id: "market", content: "市场下跌，检查股票投资仓位", tags: [] },
      { ...state.entries[0], id: "low", content: "傍晚沿河散步", tags: [] },
      { ...state.entries[1], id: "already-study", content: "继续学习课程", categoryId: "study" }
    ],
    allEntries: state.entries,
    categories
  });
  const assignments = result.groups.flatMap((group) => group.entries.map((entry) => [entry.entryId, group.categoryId]));
  assert.deepEqual(new Map(assignments), new Map([
    ["a", "health-food"],
    ["sleep", "health-rest"],
    ["learn", "study"],
    ["market", "trading"]
  ]));
  assert.equal(assignments.filter(([entryId]) => entryId === "a").length, 1);
  assert.ok(result.unmatchedEntryIds.includes("low"));
  assert.ok(result.unmatchedEntryIds.includes("already-study"));
});

test("显式应用只改变 categoryId，正文、标签、模板、附件和时间保持不变，撤销可恢复", () => {
  const before = structuredClone(state.entries[0]);
  const snapshot = organizationSnapshot(state.entries, ["a"]);
  const applied = applyOrganization(state, [{ entryId: "a", categoryId: "health-food" }]);
  assert.equal(applied.entries[0].categoryId, "health-food");
  assert.equal(applied.entries[0].content, before.content);
  assert.deepEqual(applied.entries[0].tags, before.tags);
  assert.equal(applied.entries[0].templateId, before.templateId);
  assert.deepEqual(applied.entries[0].attachments, before.attachments);
  assert.equal(applied.entries[0].date, before.date);
  assert.equal(applied.entries[0].time, before.time);
  const restored = restoreOrganization(applied, snapshot);
  assert.equal(restored.entries[0].categoryId, before.categoryId);
  assert.deepEqual(restored.entries[0].tags, before.tags);
});

test("非法分类、同一记录的第二个目标和标签写入都会被忽略", () => {
  const applied = applyOrganization(state, [
    { entryId: "a", categoryId: "missing", tags: ["AI标签"] },
    { entryId: "a", categoryId: "study" },
    { entryId: "a", categoryId: "trading" },
    { entryId: "outside", categoryId: "study" }
  ]);
  assert.equal(applied.entries[0].categoryId, "study");
  assert.deepEqual(applied.entries[0].tags, ["手工标签"]);
  assert.equal(applied.entries.length, state.entries.length);
});
