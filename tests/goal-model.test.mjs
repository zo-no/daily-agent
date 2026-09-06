import test from "node:test";
import assert from "node:assert/strict";
import { normalizeGoals } from "../src/lib/goal-model.mjs";
import { buildPlanRecordReviewFacts } from "../src/modules/organize/plan-record-review/model.mjs";

test("目标模型兼容旧备份并校验日期范围", () => {
  assert.deepEqual(normalizeGoals(undefined), []);
  assert.equal(normalizeGoals([{ id: "g1", content: "Ship", startDate: "2026-09-01", endDate: "2026-09-30" }])[0].status, "active");
  assert.throws(() => normalizeGoals([{ id: "g1", content: "Ship", startDate: "2026-09-30", endDate: "2026-09-01" }]), /date range/);
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
