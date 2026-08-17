import test from "node:test";
import assert from "node:assert/strict";
import {
  applyOrganization,
  availableClassificationTags,
  organizationSnapshot,
  organizeEntries,
  restoreOrganization
} from "../src/lib/classification-model.mjs";
import { createRuleClassifierProvider } from "../src/lib/classifier-provider.mjs";

const state = {
  templates: [
    { id: "quick", recordType: "linear", tags: ["work"] },
    { id: "daily", recordType: "periodic", tags: ["health"] }
  ],
  entries: [
    { id: "a", date: "2026-08-14", time: "09:00", content: "完成产品评审和工作复盘", categoryId: "notes", templateId: "quick", tags: [], createdAt: 3 },
    { id: "b", date: "2026-08-13", time: "20:00", content: "工作项目复盘，整理评审反馈", categoryId: "notes", templateId: "quick", tags: ["work"], createdAt: 2 },
    { id: "c", date: "2026-08-08", time: "08:00", content: "跑步五公里", categoryId: "health", templateId: "quick", tags: ["health"], createdAt: 1 },
    { id: "d", date: "2026-08-14", time: "07:00", content: "体重=70kg", categoryId: "metrics", templateId: "daily", tags: [], createdAt: 4 }
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

test("标签词表只来自现有模板和记录并去重", () => {
  assert.deepEqual(availableClassificationTags(state), ["health", "work"]);
});

test("本地 provider 只建议已有标签，低置信保持为空", async () => {
  const result = await createRuleClassifierProvider().analyze({
    entries: [state.entries[0], { ...state.entries[0], id: "z", content: "晚饭后散步" }],
    allEntries: state.entries,
    availableTags: availableClassificationTags(state)
  });
  assert.deepEqual(result.groups.map((group) => group.tag), ["work"]);
  assert.ok(result.groups[0].entries.some((entry) => entry.entryId === "a"));
  assert.ok(result.unmatchedEntryIds.includes("z"));
});

test("本地 provider 可用离线同义词匹配用户已有的中文标签", async () => {
  const result = await createRuleClassifierProvider().analyze({
    entries: [{ ...state.entries[0], id: "market", content: "市场分化，准备调整投资仓位" }],
    allEntries: state.entries,
    availableTags: ["交易"]
  });
  assert.deepEqual(result.groups.map((group) => group.tag), ["交易"]);
  assert.equal(result.groups[0].confidence, "high");
});

test("显式应用和撤销只改变分类字段，不改写原始正文", () => {
  const snapshot = organizationSnapshot(state.entries, ["a"]);
  const applied = applyOrganization(state, [{ entryId: "a", tags: ["work", "work"] }]);
  assert.deepEqual(applied.entries[0].tags, ["work"]);
  assert.equal(applied.entries[0].content, state.entries[0].content);
  const restored = restoreOrganization(applied, snapshot);
  assert.deepEqual(restored.entries[0].tags, []);
  assert.equal(restored.entries[0].content, state.entries[0].content);
});

test("批量应用会合并同一记录的多个建议并限制为三个标签", () => {
  const applied = applyOrganization(state, [
    { entryId: "a", tags: ["work"] },
    { entryId: "a", tags: ["health"] },
    { entryId: "a", tags: ["study"] },
    { entryId: "a", tags: ["extra"] }
  ]);
  assert.deepEqual(applied.entries[0].tags, ["work", "health", "study"]);
  assert.equal(applied.entries[0].content, state.entries[0].content);
});

test("记录已有标签与新建议合并后最终仍最多保留三个", () => {
  const withExisting = {
    ...state,
    entries: state.entries.map((entry) => entry.id === "a" ? { ...entry, tags: ["existing-a", "existing-b"] } : entry)
  };
  const applied = applyOrganization(withExisting, [
    { entryId: "a", tags: ["work"] },
    { entryId: "a", tags: ["health"] },
    { entryId: "a", tags: ["study"] }
  ]);
  assert.deepEqual(applied.entries[0].tags, ["existing-a", "existing-b", "work"]);
  assert.equal(applied.entries[0].content, state.entries[0].content);
  assert.equal(applied.entries[0].categoryId, state.entries[0].categoryId);
});
