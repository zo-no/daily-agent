import test from "node:test";
import assert from "node:assert/strict";
import {
  chronologicalReviewEntries,
  createLocalDailyReview,
  normalizeDailyReviewOutput
} from "../src/lib/daily-review-model.mjs";

const entries = [
  { id: "late", time: "20:10", content: "晚间复盘", createdAt: 4 },
  { id: "missing", time: "", content: "没有记录时间", createdAt: 1 },
  { id: "morning", time: "08:15", content: "晨间记录", createdAt: 2 },
  { id: "noon", time: "13:30", content: "午后推进", createdAt: 3 }
];

test("每日梳理按真实时间正序排列，无时间记录稳定放在最后", () => {
  assert.deepEqual(chronologicalReviewEntries(entries).map((entry) => entry.id), ["morning", "noon", "late", "missing"]);
  const local = createLocalDailyReview(entries, { generatedAt: 10 });
  assert.equal(local.providerId, "local-timeline-v1");
  assert.equal(local.overview, "");
  assert.equal(local.generatedAt, 10);
  assert.deepEqual(local.segments.map((segment) => segment.period), ["morning", "afternoon", "evening", "unscheduled"]);
  assert.ok(local.segments.every((segment) => segment.sourceOnly && !segment.summary));
  assert.deepEqual(local.segments.flatMap((segment) => segment.entryIds), ["morning", "noon", "late", "missing"]);
});

test("模型结果只引用当次记录，去重后按源时间重排并补回遗漏记录", () => {
  const result = normalizeDailyReviewOutput({
    overview: "  一天围绕学习与复盘展开。  ",
    segments: [
      { title: "晚间复盘", summary: "晚上完成回顾。", entryIds: ["late", "outside"] },
      { title: "上午到午后", summary: "先记录早晨，再继续推进。", entryIds: ["noon", "morning", "late"] },
      { title: "越权重复", summary: "不应出现。", entryIds: ["morning"] }
    ]
  }, { entries }, 20, "deepseek:test");

  assert.equal(result.providerId, "deepseek:test");
  assert.equal(result.overview, "一天围绕学习与复盘展开。");
  assert.deepEqual(result.analyzedEntryIds, ["morning", "noon", "late", "missing"]);
  assert.deepEqual(result.segments.flatMap((segment) => segment.entryIds), ["morning", "noon", "late", "missing"]);
  assert.equal(result.segments.filter((segment) => segment.entryIds.includes("late")).length, 1);
  assert.equal(result.segments.at(-1).period, "unscheduled");
  assert.equal(result.segments.at(-1).sourceOnly, true);
  assert.equal(result.segments[0].startTime, "08:15");
  assert.equal(result.segments[0].endTime, "13:30");
});
