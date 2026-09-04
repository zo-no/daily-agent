import test from "node:test";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import {
  ANALYSIS_WINDOW_DAYS,
  buildDomainInsights,
  isInvestmentDomainName
} from "../src/modules/insights/analytics/model.mjs";
import { translate } from "../src/lib/i18n.mjs";

const endDate = "2026-08-30";

function fixture(overrides = {}) {
  return {
    domains: [
      { id: "daily", name: "Daily", order: 2 },
      { id: "invest", name: "投资", order: 1 },
      { id: "health", name: "Health", order: 3 }
    ],
    categories: [
      { id: "daily-notes", domainId: "daily", name: "Notes", order: 1 },
      { id: "trades", domainId: "invest", name: "交易", order: 1 }
    ],
    templates: [{ id: "trade-review", categoryId: "trades", name: "Review", order: 1, recordType: "periodic" }],
    entries: [
      { id: "rationale", date: "2026-08-01", time: "09:00", content: "因为利率变化，记录这次判断理由。", categoryId: "trades", templateId: null, createdAt: 1 },
      { id: "outcome", date: "2026-08-24", time: "15:00", content: "收盘后复盘结果，预期没有发生。", categoryId: "trades", templateId: "trade-review", createdAt: 2 },
      { id: "risk", date: "2026-08-30", time: "10:00", content: "风险边界是失效后退出。", categoryId: "trades", templateId: null, createdAt: 3 },
      { id: "daily", date: "2026-08-15", time: "20:00", content: "普通日记", categoryId: "daily-notes", templateId: null, createdAt: 4 },
      { id: "unresolved", date: "2026-08-29", time: "12:00", content: "旧分类记录", categoryId: "removed", templateId: null, createdAt: 5 },
      { id: "before", date: "2026-07-31", time: "09:00", content: "窗口之前", categoryId: "daily-notes", templateId: null, createdAt: 6 },
      { id: "after", date: "2026-08-31", time: "09:00", content: "窗口之后", categoryId: "daily-notes", templateId: null, createdAt: 7 },
      { id: "invalid", date: "2026-02-30", time: "09:00", content: "无效日期", categoryId: "daily-notes", templateId: null, createdAt: 8 }
    ],
    ...overrides
  };
}

test("domain insights reconcile an inclusive 30-day local window without double counting", () => {
  const input = fixture();
  const snapshot = structuredClone(input);
  const result = buildDomainInsights(input, { endDate });

  assert.equal(ANALYSIS_WINDOW_DAYS, 30);
  assert.equal(result.window.startDate, "2026-08-01");
  assert.equal(result.window.endDate, endDate);
  assert.equal(result.window.days.length, 30);
  assert.equal(result.window.days[0], "2026-08-01");
  assert.equal(result.window.days.at(-1), endDate);

  assert.deepEqual(result.domains.map((domain) => domain.domainId), ["invest", "daily", "health"]);
  const investment = result.domains[0];
  assert.equal(investment.totalRecords, 3);
  assert.equal(investment.activeDays, 3);
  assert.equal(investment.ordinaryRecords, 2);
  assert.equal(investment.periodicRecords, 1);
  assert.deepEqual(investment.series[0], {
    date: "2026-08-01",
    count: 1,
    ordinaryCount: 1,
    periodicCount: 0
  });
  assert.deepEqual(investment.series[23], {
    date: "2026-08-24",
    count: 1,
    ordinaryCount: 0,
    periodicCount: 1
  });
  assert.deepEqual(investment.series.at(-1), {
    date: "2026-08-30",
    count: 1,
    ordinaryCount: 1,
    periodicCount: 0
  });
  for (const domain of result.domains) {
    assert.equal(domain.series.length, 30);
    for (const point of domain.series) {
      assert.deepEqual(Object.keys(point), ["date", "count", "ordinaryCount", "periodicCount"]);
      assert.equal(point.ordinaryCount + point.periodicCount, point.count);
    }
  }

  assert.equal(result.domains[1].totalRecords, 1);
  assert.equal(result.domains[2].totalRecords, 0);
  assert.equal(result.unresolved.totalRecords, 1);
  assert.equal(result.totals.records, 5);
  assert.equal(
    result.totals.records,
    result.domains.reduce((sum, domain) => sum + domain.totalRecords, 0) + result.unresolved.totalRecords
  );
  assert.equal(result.diagnostics.invalidDateRecords, 1);
  assert.equal(result.diagnostics.outsideWindowRecords, 2);
  assert.deepEqual(input, snapshot, "analysis must not mutate the account payload");
});

test("empty and sparse domains stay factual and never claim a trend", () => {
  const result = buildDomainInsights(fixture(), { endDate });
  const daily = result.domains.find((domain) => domain.domainId === "daily");
  const health = result.domains.find((domain) => domain.domainId === "health");

  assert.equal(daily.evidenceState, "insufficient");
  assert.equal(daily.trendDirection, "unknown");
  assert.equal(daily.promptKey, null);
  assert.equal(health.evidenceState, "empty");
  assert.equal(health.trendDirection, "unknown");
  assert.equal(health.series.every((point) => point.count === 0), true);
  assert.equal(health.series.every((point) => point.ordinaryCount === 0 && point.periodicCount === 0), true);
});

test("daily series preserves zero, single-peak, and multi-peak subtype facts", () => {
  const zero = buildDomainInsights(fixture({ entries: [] }), { endDate });
  const zeroDaily = zero.domains.find((domain) => domain.domainId === "daily");
  assert.equal(zeroDaily.series.every((point) => point.count === 0), true);

  const single = buildDomainInsights(fixture({
    entries: [
      { id: "ordinary-a", date: "2026-08-11", time: "08:00", content: "one", categoryId: "trades" },
      { id: "ordinary-b", date: "2026-08-11", time: "09:00", content: "two", categoryId: "trades" },
      { id: "periodic-a", date: "2026-08-11", time: "10:00", content: "three", categoryId: "trades", templateId: "trade-review" }
    ]
  }), { endDate });
  const singleInvestment = single.domains.find((domain) => domain.domainId === "invest");
  assert.deepEqual(singleInvestment.series[10], {
    date: "2026-08-11",
    count: 3,
    ordinaryCount: 2,
    periodicCount: 1
  });
  assert.equal(singleInvestment.series.filter((point) => point.count > 0).length, 1);

  const multi = buildDomainInsights(fixture({
    entries: [
      { id: "first", date: "2026-08-02", time: "08:00", content: "first", categoryId: "trades" },
      { id: "second", date: "2026-08-20", time: "08:00", content: "second", categoryId: "trades", templateId: "trade-review" },
      { id: "third", date: "2026-08-20", time: "09:00", content: "third", categoryId: "trades" }
    ]
  }), { endDate });
  const multiInvestment = multi.domains.find((domain) => domain.domainId === "invest");
  assert.deepEqual(multiInvestment.series.filter((point) => point.count > 0), [
    { date: "2026-08-02", count: 1, ordinaryCount: 1, periodicCount: 0 },
    { date: "2026-08-20", count: 2, ordinaryCount: 1, periodicCount: 1 }
  ]);
});

test("an empty investment-like domain still exposes zero coverage without a null state", () => {
  const result = buildDomainInsights(fixture({
    domains: [{ id: "empty-finance", name: "Finance", order: 1 }],
    categories: [],
    templates: [],
    entries: []
  }), { endDate });
  const finance = result.domains[0];

  assert.equal(finance.evidenceState, "empty");
  assert.deepEqual(finance.investmentCoverage, {
    rationale: 0,
    outcome: 0,
    riskBoundary: 0,
    leastCovered: "rationale"
  });
  assert.equal(finance.investmentPromptKey, "insights.investmentPrompt.rationale");
  assert.deepEqual(finance.investmentSourceIds, []);
});

test("ready trend direction compares the latest seven days with the preceding seven", () => {
  const result = buildDomainInsights(fixture(), { endDate });
  const investment = result.domains.find((domain) => domain.domainId === "invest");

  assert.equal(investment.evidenceState, "ready");
  assert.equal(investment.trendDirection, "up");
  assert.equal(investment.promptKey, "insights.prompt.up");
  assert.deepEqual(investment.trendEvidence, { previousSeven: 0, latestSeven: 2 });
});

test("internal recent evidence stays deterministic, bounded, normalized, and source linked", () => {
  const longContent = `  一段   很长的记录 ${"字".repeat(220)}  `;
  const result = buildDomainInsights(fixture({
    entries: [
      ...fixture().entries,
      { id: "long", date: "2026-08-30", time: "21:00", content: longContent, categoryId: "daily-notes", templateId: null, createdAt: 20 }
    ]
  }), { endDate, maxRecentSources: 2 });
  const daily = result.domains.find((domain) => domain.domainId === "daily");

  assert.equal(daily.recentSources.length, 2);
  assert.equal(daily.recentSources[0].id, "long");
  assert.equal(daily.recentSources[0].excerpt.includes("   "), false);
  assert.ok(Array.from(daily.recentSources[0].excerpt).length <= 161);
  assert.equal(daily.recentSources[0].excerpt.endsWith("…"), true);
});

test("investment recognition is a closed localized name list and ignores note content", () => {
  for (const name of [
    "投资", "交易复盘", "家庭理财", "金融记录", "股票", "指数基金", "证券账户",
    "Investment", "Investing", "Trading journal", "Personal Finance", "Stocks", "Index Funds", "Securities"
  ]) {
    assert.equal(isInvestmentDomainName(name), true, name);
  }
  for (const name of ["Daily", "Financier", "Tradeoffs", "Market", "健康"]) {
    assert.equal(isInvestmentDomainName(name), false, name);
  }

  const result = buildDomainInsights(fixture({
    domains: [{ id: "daily", name: "Daily", order: 1 }],
    categories: [{ id: "daily-notes", domainId: "daily", name: "Notes", order: 1 }],
    templates: [],
    entries: [
      { id: "content-only", date: endDate, time: "09:00", content: "investment trading finance 投资交易", categoryId: "daily-notes" }
    ]
  }), { endDate });
  assert.equal(result.domains[0].investmentLike, false);
  assert.equal(result.domains[0].investmentCoverage, null);
});

test("investment coverage reports recording evidence and chooses the least-covered prompt deterministically", () => {
  const result = buildDomainInsights(fixture(), { endDate });
  const investment = result.domains.find((domain) => domain.domainId === "invest");

  assert.equal(investment.investmentLike, true);
  assert.deepEqual(investment.investmentCoverage, {
    rationale: 1,
    outcome: 1,
    riskBoundary: 1,
    leastCovered: "rationale"
  });
  assert.equal(investment.investmentPromptKey, "insights.investmentPrompt.rationale");
  assert.deepEqual(investment.investmentSourceIds, ["risk", "outcome", "rationale"]);
});

test("investment coverage uses exactly the bounded internal source set", () => {
  const result = buildDomainInsights(fixture({
    entries: [
      { id: "older-rationale", date: "2026-08-01", time: "09:00", content: "Because the original thesis looked plausible.", categoryId: "trades" },
      { id: "recent-one", date: "2026-08-28", time: "09:00", content: "A plain observation.", categoryId: "trades" },
      { id: "recent-two", date: "2026-08-29", time: "09:00", content: "Reviewed the outcome.", categoryId: "trades" },
      { id: "recent-three", date: "2026-08-30", time: "09:00", content: "The risk boundary stayed explicit.", categoryId: "trades" }
    ]
  }), { endDate, maxRecentSources: 3 });
  const investment = result.domains.find((domain) => domain.domainId === "invest");

  assert.deepEqual(investment.investmentSourceIds, ["recent-three", "recent-two", "recent-one"]);
  assert.deepEqual(investment.investmentCoverage, {
    rationale: 0,
    outcome: 1,
    riskBoundary: 1,
    leastCovered: "rationale"
  });
});

test("localized investment prompts stay inside the record-review boundary", () => {
  for (const locale of ["en", "zh-CN"]) {
    const prompts = ["rationale", "outcome", "riskBoundary"]
      .map((key) => translate(locale, `insights.investmentPrompt.${key}`))
      .join(" ");
    assert.doesNotMatch(prompts, /buy|sell|hold|security|price|return|allocation|买|卖|持有|标的|价格|收益|仓位/i);
    assert.match(translate(locale, "insights.investmentBoundary"), locale === "en" ? /not investment advice/i : /不构成投资建议/);
  }
});

test("invalid end dates are rejected rather than coerced", () => {
  for (const invalid of ["", "2026-02-30", "2026-8-1", "not-a-date"]) {
    assert.throws(() => buildDomainInsights(fixture(), { endDate: invalid }), /valid local date/i);
  }
});

test("5,000 records remain within the bounded local model budget", () => {
  const entries = Array.from({ length: 5_000 }, (_, index) => ({
    id: `entry-${index}`,
    date: `2026-08-${String(1 + (index % 30)).padStart(2, "0")}`,
    time: "09:00",
    content: index % 3 === 0 ? "因为理由，复盘结果，风险边界。" : "普通记录",
    categoryId: index % 2 ? "daily-notes" : "trades",
    templateId: index % 5 === 0 ? "trade-review" : null,
    createdAt: index
  }));
  const input = fixture({ entries });
  const started = performance.now();
  const result = buildDomainInsights(input, { endDate });
  const elapsed = performance.now() - started;

  assert.equal(result.totals.records, 5_000);
  assert.ok(elapsed <= 1_000, `model derivation took ${elapsed.toFixed(2)}ms`);
});
