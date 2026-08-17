/**
 * @fileoverview Verifies local day-plan normalization, snapping, migration, and overlap layout.
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlanDraft,
  layoutPlanBlocks,
  minutesToTime,
  normalizePlanBlocks,
  planBlocksForDate,
  snapPlanMinutes,
  timeToMinutes
} from "../src/lib/plan-model.mjs";

test("计划时间支持分钟换算和 15 分钟吸附", () => {
  assert.equal(timeToMinutes("09:30"), 570);
  assert.equal(timeToMinutes("24:00"), null);
  assert.equal(minutesToTime(570), "09:30");
  assert.equal(snapPlanMinutes(578), 585);
});

test("旧备份缺少计划时间块时安全迁移为空数组", () => {
  assert.deepEqual(normalizePlanBlocks(undefined), []);
});

test("计划时间块校验范围、排序和重复 ID", () => {
  const blocks = normalizePlanBlocks([
    { id: "later", date: "2026-08-14", title: "Later", startTime: "11:00", endTime: "12:00" },
    { id: "first", date: "2026-08-14", title: "First", startTime: "09:00", endTime: "10:30" }
  ]);
  assert.deepEqual(blocks.map((block) => block.id), ["first", "later"]);
  assert.deepEqual(planBlocksForDate(blocks, "2026-08-13"), []);
  assert.throws(() => normalizePlanBlocks([{ ...blocks[0] }, { ...blocks[0] }]), /duplicate plan block IDs/);
  assert.throws(() => normalizePlanBlocks([{ ...blocks[0], endTime: "08:00" }]), /time range is invalid/);
});

test("新计划草稿默认创建一小时本地时间块", () => {
  const draft = createPlanDraft("2026-08-14", 9 * 60 + 8);
  assert.deepEqual(
    { date: draft.date, startTime: draft.startTime, endTime: draft.endTime, source: draft.source },
    { date: "2026-08-14", startTime: "09:15", endTime: "10:15", source: "local" }
  );
});

test("重叠计划会分列，后续非重叠计划恢复整列", () => {
  const layout = layoutPlanBlocks([
    { id: "a", date: "2026-08-14", title: "A", startTime: "09:00", endTime: "11:00" },
    { id: "b", date: "2026-08-14", title: "B", startTime: "09:30", endTime: "10:30" },
    { id: "c", date: "2026-08-14", title: "C", startTime: "12:00", endTime: "13:00" }
  ]);
  assert.deepEqual(layout.map(({ block, column, columns }) => [block.id, column, columns]), [
    ["a", 0, 2], ["b", 1, 2], ["c", 0, 1]
  ]);
});
