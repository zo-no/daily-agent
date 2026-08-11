/**
 * @fileoverview 验证记录数据清洗、日期切换、导出与备份恢复行为。
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  backupPayload,
  createInitialState,
  markdownForDate,
  normalizeState,
  sanitizeTags,
  shiftDate
} from "../src/lib/data.mjs";

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
