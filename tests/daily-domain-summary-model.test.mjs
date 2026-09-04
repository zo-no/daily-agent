import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDailyDomainInput,
  normalizeDomainDailySummaryOutput,
  sanitizeDomainDailySummaryInput,
  validateDomainDailySummaryResponse
} from "../src/modules/insights/domain-daily-summary/model.mjs";

const base = {
  domains: [{ id: "health", name: "健康" }, { id: "other", name: "其他" }],
  categories: [{ id: "body", domainId: "health" }, { id: "other-cat", domainId: "other" }],
  templates: [{ id: "habit", categoryId: "body", recordType: "periodic" }],
  entries: [
    { id: "ordinary", date: "2026-09-03", time: "09:00", content: "完成散步", categoryId: "body" },
    { id: "periodic", date: "2026-09-03", time: "08:00", content: "睡眠记录", categoryId: "body", templateId: "habit" },
    { id: "yesterday", date: "2026-09-02", time: "10:00", content: "旧记录", categoryId: "body" },
    { id: "other-domain", date: "2026-09-03", time: "11:00", content: "不发送", categoryId: "other-cat" },
    { id: "unresolved", date: "2026-09-03", time: "12:00", content: "不发送", categoryId: "removed" },
    { id: "plan", date: "2026-09-03", time: "13:00", title: "计划", categoryId: "body", kind: "plan" }
  ]
};

test("daily selector uses local date and selected domain only, with ordinary/periodic counts", () => {
  const snapshot = structuredClone(base);
  const result = buildDailyDomainInput(base, { domainId: "health", domainName: "健康", locale: "zh-CN", date: "2026-09-03" });
  assert.equal(result.totalCount, 2);
  assert.equal(result.ordinaryCount, 1);
  assert.equal(result.periodicCount, 1);
  assert.equal(result.omittedCount, 0);
  assert.deepEqual(result.entries.map((entry) => entry.id), ["ordinary", "periodic"]);
  assert.ok(result.sourceFingerprint);
  assert.deepEqual(base, snapshot);
});

test("daily selector deterministically omits invalid/duplicate sources and caps newest 80", () => {
  const entries = Array.from({ length: 84 }, (_, index) => ({
    id: `entry-${String(index).padStart(3, "0")}`,
    date: "2026-09-03",
    time: `${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
    content: `记录 ${index}`,
    categoryId: "body"
  }));
  entries.push({ id: "bad-time", date: "2026-09-03", time: "9:00", content: "坏时间", categoryId: "body" });
  entries.push({ id: "entry-083", date: "2026-09-03", time: "23:59", content: "重复", categoryId: "body" });
  const result = buildDailyDomainInput({ ...base, entries }, { domainId: "health", domainName: "健康", locale: "en", date: "2026-09-03" });
  assert.equal(result.totalCount, 86);
  assert.equal(result.ordinaryCount, 86);
  assert.equal(result.entries.length, 80);
  assert.equal(result.entries[0].id, "entry-083");
  assert.equal(result.entries[0].content, "重复", "The newest duplicate should own the retained transport identity");
  assert.equal(result.omittedCount, 6);
});

test("daily selector truncates transport copies by Unicode code point without mutating local records", () => {
  const longContent = "🙂".repeat(4001);
  const data = { ...base, entries: [{ id: "unicode", date: "2026-09-03", time: "", content: longContent, categoryId: "body" }] };
  const result = buildDailyDomainInput(data, { domainId: "health", domainName: "健康", locale: "zh-CN", date: "2026-09-03" });
  assert.equal(Array.from(result.entries[0].content).length, 4000);
  assert.equal(data.entries[0].content, longContent);
  assert.equal(result.sourceFingerprint.includes(longContent), false);
  assert.throws(() => buildDailyDomainInput(data, { domainId: "health", date: "2026-02-30" }), (error) => error.code === "AI_DOMAIN_DAILY_SUMMARY_INPUT_INVALID");
});

test("strict request and response contracts keep exact keys, Unicode bounds, source coverage and safety", () => {
  const input = sanitizeDomainDailySummaryInput({
    domainName: "健康", date: "2026-09-03", locale: "zh-CN",
    entries: [{ id: "a", date: "2026-09-03", time: "", content: "🙂".repeat(4000), sourceType: "ordinary" }]
  });
  const output = normalizeDomainDailySummaryOutput({
    overview: "今天记录了散步。",
    overviewEntryIds: ["a"],
    themes: [{ title: "活动", summary: "记录提到散步。", entryIds: ["a"] }]
  }, input, 42, "deepseek:test");
  assert.deepEqual(validateDomainDailySummaryResponse(output, input), output);
  const invalid = [
    { ...output, extra: true },
    { ...output, overviewEntryIds: ["outside"] },
    { ...output, themes: [{ ...output.themes[0], entryIds: ["a", "a"] }] },
    { ...output, providerId: "x".repeat(129) },
    { ...output, overview: "One. Two. Three. Four." },
    { ...output, themes: Array.from({ length: 4 }, (_, index) => ({ title: `Theme ${index}`, summary: "Fact.", entryIds: ["a"] })) },
    { ...output, themes: [{ title: "Same", summary: "Fact.", entryIds: ["a"] }, { title: "same", summary: "Other fact.", entryIds: ["a"] }] },
    { ...output, themes: [{ title: "Theme", summary: "One. Two.", entryIds: ["a"] }] }
  ];
  for (const candidate of invalid) assert.throws(() => validateDomainDailySummaryResponse(candidate, input));
  assert.throws(() => sanitizeDomainDailySummaryInput({ ...input, accountId: "forbidden" }));
  assert.throws(() => sanitizeDomainDailySummaryInput({ ...input, entries: [{ ...input.entries[0], time: "9:00" }] }));
  assert.throws(() => sanitizeDomainDailySummaryInput({ ...input, entries: [{ ...input.entries[0], content: "🙂".repeat(4001) }] }));
});

test("general unsafe and investment guidance invalidate the complete result", () => {
  const safeInput = sanitizeDomainDailySummaryInput({ domainName: "健康", date: "2026-09-03", locale: "zh-CN", entries: [{ id: "a", date: "2026-09-03", time: "09:00", content: "记录", sourceType: "ordinary" }] });
  const investInput = sanitizeDomainDailySummaryInput({ domainName: "投资", date: "2026-09-03", locale: "zh-CN", entries: [{ id: "a", date: "2026-09-03", time: "09:00", content: "记录", sourceType: "ordinary" }] });
  for (const text of ["这说明你需要休息。", "Recommend a portfolio.", "新增一个待办。", "Set a reminder."]) {
    assert.throws(() => normalizeDomainDailySummaryOutput({ overview: text, overviewEntryIds: ["a"], themes: [] }, safeInput), (error) => error.code === "AI_DOMAIN_DAILY_SUMMARY_UNSAFE");
  }
  for (const text of ["建议买入。", "继续持有。", "价格目标为十元。", "把仓位降到一半。", "调整资产配置。", "预计会获得收益。", "Forecast a profit.", "Sell the security."]) {
    assert.throws(() => normalizeDomainDailySummaryOutput({ overview: text, overviewEntryIds: ["a"], themes: [] }, investInput), (error) => error.code === "AI_DOMAIN_DAILY_SUMMARY_UNSAFE");
  }
});
