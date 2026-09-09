import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGoals, setGoalRecordAssociation } from "../src/lib/goal-model.mjs";
import { buildPlanRecordReviewFacts } from "../src/modules/organize/plan-record-review/model.mjs";
import { buildGoalProgressFacts } from "../src/modules/goals/okr-progress/model.mjs";

test("目标模型兼容旧备份并校验日期范围", () => {
  assert.deepEqual(normalizeGoals(undefined), []);
  assert.equal(normalizeGoals([{ id: "g1", content: "Ship", startDate: "2026-09-01", endDate: "2026-09-30" }])[0].status, "active");
  assert.throws(() => normalizeGoals([{ id: "g1", content: "Ship", startDate: "2026-09-30", endDate: "2026-09-01" }]), /date range/);
});

test("OKR 记录关联只改变目标元数据并支持在 KR 之间移动", () => {
  const goal = normalizeGoals([{ id: "g1", content: "Ship", keyResults: [{ id: "k1", content: "发布" }, { id: "k2", content: "复盘" }] }])[0];
  const withFirst = setGoalRecordAssociation(goal, "r1", "k1");
  assert.deepEqual(withFirst.keyResults[0].recordIds, ["r1"]);
  const withSecond = setGoalRecordAssociation(withFirst, "r1", "k2");
  assert.deepEqual(withSecond.keyResults.map((item) => item.recordIds), [[], ["r1"]]);
  const detached = setGoalRecordAssociation(withSecond, "r1", null, false);
  assert.deepEqual(detached.keyResults.map((item) => item.recordIds), [[], []]);
});

test("目标证据在有关联时只收录已关联记录并保留原始内容", () => {
  const goal = normalizeGoals([{ id: "g1", content: "Ship", startDate: "2026-09-01", endDate: "2026-09-03", keyResults: [{ id: "k1", content: "发布", recordIds: ["r1"] }] }])[0];
  const facts = buildGoalProgressFacts({ goal, entries: [
    { id: "r1", date: "2026-09-01", time: "09:00", content: "原始记录" },
    { id: "r2", date: "2026-09-02", time: "10:00", content: "未关联" }
  ] });
  assert.deepEqual(facts.evidence.map((item) => item.id), ["r1"]);
  assert.equal(facts.evidence[0].content, "原始记录");
  assert.deepEqual(facts.keyResults[0].evidenceDates, ["2026-09-01"]);
});

test("计划记录对比只使用本地计划与普通记录并给出时间证据", () => {
  const facts = buildPlanRecordReviewFacts({
    date: "2026-09-06",
    plans: [
      { id: "p1", source: "local", date: "2026-09-06", title: "写作", startTime: "09:00", endTime: "10:00" },
      { id: "p2", source: "local", date: "2026-09-06", title: "复盘", startTime: "14:00", endTime: "15:00" },
      { id: "google", source: "google", date: "2026-09-06", title: "外部", startTime: "09:00", endTime: "10:00" }
    ],
    entries: [
      { id: "e1", date: "2026-09-06", time: "09:30", content: "完成一段文字", templateId: "quick" },
      { id: "e2", date: "2026-09-06", time: "18:00", content: "散步", templateId: "quick" },
      { id: "e3", date: "2026-09-06", time: "14:30", content: "周期指标", templateId: "daily" }
    ],
    templates: [{ id: "quick", recordType: "linear" }, { id: "daily", recordType: "periodic" }]
  });
  assert.equal(facts.plans.length, 2);
  assert.equal(facts.entries.find((entry) => entry.id === "e1").evidence, "inside");
  assert.equal(facts.entries.find((entry) => entry.id === "e2").evidence, "outside");
  assert.equal(facts.comparisons.find((item) => item.planId === "p2").evidence, "missing");
  assert.equal(facts.metrics.planCoverageRatio, 0.5);
});
