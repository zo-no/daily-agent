/**
 * @fileoverview 验证记录数据清洗、日期切换、导出与备份恢复行为。
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  backupPayload,
  composeTemplateContent,
  createInitialState,
  ensureTemplateSchema,
  markdownForDate,
  normalizeState,
  sanitizeTags,
  shiftDate
} from "../src/lib/data.mjs";
import { createDailySeedEntries } from "../src/lib/seed.mjs";

test("标签会去重并移除井号", () => {
  assert.deepEqual(sanitizeTags("#饮食, 饮食 工作"), ["饮食", "工作"]);
});

test("日期切换跨月正确", () => {
  assert.equal(shiftDate("2026-08-01", -1), "2026-07-31");
});

test("单日 Markdown 保留父子分类和时间顺序", () => {
  const state = createInitialState();
  state.entries = [
    { id: "2", date: "2026-08-11", time: "12:20", content: "南瓜粥", categoryId: "health-food", tags: ["饮食"], createdAt: 2 },
    { id: "1", date: "2026-08-11", time: "08:28", content: "出发上班", categoryId: "daily", tags: [], createdAt: 1 }
  ];
  assert.equal(
    markdownForDate(state, "2026-08-11"),
    "## 日常记录\n\n- 08:28 出发上班\n\n## 健康\n\n### 饮食节奏\n\n- 12:20 南瓜粥 #饮食\n"
  );
});

test("JSON 备份可以恢复为规范数据", () => {
  const original = createInitialState();
  const restored = normalizeState(JSON.parse(backupPayload(original)));
  assert.equal(restored.categories.length, original.categories.length);
  assert.equal(restored.templates.length, original.templates.length);
});

test("今日原始日记以 18 条测试记录原样载入", () => {
  const entries = createDailySeedEntries();
  assert.equal(entries.length, 18);
  assert.equal(entries[5].sourceLine, "- 11:37  现在开始做一下报告");
  assert.equal(entries[5].content, " 现在开始做一下报告");
  assert.equal(entries[7].sourceLine, "- 13:02 ");
  assert.equal(entries[7].content, "");
  assert.equal(entries[8].content, "晨重=66.95kg");
});

test("万能模板把已填写字段组合为一条记录", () => {
  const template = createInitialState().templates.find((item) => item.id === "universal");
  assert.equal(
    composeTemplateContent(template, { content: "完成产品梳理", status: "已完成", next: "验证移动端" }),
    "完成产品梳理；状态：已完成；下一步：验证移动端"
  );
});

test("备份恢复保留空记录、模板字段和原始来源", () => {
  const original = createInitialState();
  const restored = normalizeState(JSON.parse(backupPayload(original)));
  assert.equal(restored.entries.find((item) => item.time === "13:02").content, "");
  assert.equal(restored.entries[0].source, "2026_08_11.md");
  assert.equal(restored.templates.find((item) => item.id === "meal").fields.length, 4);
});

test("旧数据迁移时会获得万能记录模板", () => {
  const oldState = createInitialState();
  oldState.templateSchemaVersion = 0;
  oldState.templates = oldState.templates.filter((item) => item.id !== "universal");
  assert.ok(ensureTemplateSchema(oldState).templates.some((item) => item.id === "universal"));
});
