import test from "node:test";
import assert from "node:assert/strict";
import {
  buildWeeklyDomainInput,
  normalizeDomainReviewOutput,
  sanitizeDomainReviewInput,
  validateDomainReviewResponse
} from "../src/modules/insights/domain-review/model.mjs";

function fixture(overrides = {}) {
  return {
    domains: [
      { id: "health", name: "健康", order: 1 },
      { id: "learning", name: "学习", order: 2 },
      { id: "invest", name: "投资", order: 3 }
    ],
    categories: [
      { id: "health-note", domainId: "health", name: "身体" },
      { id: "health-periodic", domainId: "health", name: "周期" },
      { id: "learning-note", domainId: "learning", name: "阅读" },
      { id: "invest-note", domainId: "invest", name: "交易" }
    ],
    templates: [
      { id: "weekly-health", categoryId: "health-periodic", recordType: "periodic" }
    ],
    entries: [
      { id: "start", date: "2026-02-24", time: "08:00", content: "窗口第一天", categoryId: "health-note", tags: ["禁止发送"] },
      { id: "periodic", date: "2026-03-01", time: "21:00", content: "周期复盘", categoryId: "health-periodic", templateId: "weekly-health", attachments: [{ id: "private" }] },
      { id: "latest", date: "2026-03-02", time: "09:00", content: "窗口最后一天", categoryId: "health-note", fieldValues: { private: true } },
      { id: "other-domain", date: "2026-03-02", time: "10:00", content: "不应发送", categoryId: "learning-note" },
      { id: "unresolved", date: "2026-03-02", time: "11:00", content: "不应发送", categoryId: "removed" },
      { id: "outside", date: "2026-02-23", time: "12:00", content: "不应发送", categoryId: "health-note" }
    ],
    ...overrides
  };
}

test("七天选择器跨月只纳入当前领域的普通与周期正文，并保持严格白名单", () => {
  const input = fixture();
  const snapshot = structuredClone(input);
  const result = buildWeeklyDomainInput(input, {
    domainId: "health",
    domainName: "健康",
    locale: "zh-CN",
    endDate: "2026-03-02"
  });

  assert.equal(result.windowStart, "2026-02-24");
  assert.equal(result.windowEnd, "2026-03-02");
  assert.equal(result.totalCount, 3);
  assert.equal(result.ordinaryCount, 2);
  assert.equal(result.periodicCount, 1);
  assert.equal(result.omittedCount, 0);
  assert.equal(result.limitedSample, false);
  assert.deepEqual(result.entries.map((entry) => entry.id), ["latest", "periodic", "start"]);
  assert.deepEqual(result.entries.map((entry) => entry.sourceType), ["ordinary", "periodic", "ordinary"]);
  assert.ok(result.entries.every((entry) => Object.keys(entry).sort().join(",") === "content,date,id,sourceType,time"));
  assert.deepEqual(input, snapshot, "selection must not mutate the account payload");
});

test("七天选择器按 Unicode 字符限制正文并确定性保留最近 80 条", () => {
  const entries = Array.from({ length: 85 }, (_, index) => ({
    id: `entry-${String(index).padStart(3, "0")}`,
    date: "2026-03-02",
    time: `${String(Math.floor(index / 60)).padStart(2, "0")}:${String(index % 60).padStart(2, "0")}`,
    content: index === 84 ? "🙂".repeat(4_005) : `正文 ${index}`,
    categoryId: "health-note",
    accountId: "must-not-leave-browser",
    tags: ["private"]
  }));
  const result = buildWeeklyDomainInput(fixture({ entries }), {
    domainId: "health",
    domainName: "健康",
    locale: "zh-CN",
    endDate: "2026-03-02"
  });

  assert.equal(result.totalCount, 85);
  assert.equal(result.entries.length, 80);
  assert.equal(result.omittedCount, 5);
  assert.equal(result.entries[0].id, "entry-084");
  assert.equal(Array.from(result.entries[0].content).length, 4_000);
  assert.equal(result.entries.some((entry) => entry.id === "entry-000"), false);
  assert.equal(JSON.stringify(result).includes("accountId"), false);
  assert.equal(JSON.stringify(result).includes("tags"), false);
});

test("零记录与单日少样本保持可区分，未知领域不能借用未归属记录", () => {
  const zero = buildWeeklyDomainInput(fixture({ entries: [] }), {
    domainId: "health", domainName: "健康", locale: "zh-CN", endDate: "2026-03-02"
  });
  assert.equal(zero.totalCount, 0);
  assert.equal(zero.limitedSample, true);

  const limited = buildWeeklyDomainInput(fixture({ entries: [fixture().entries[2]] }), {
    domainId: "health", domainName: "健康", locale: "zh-CN", endDate: "2026-03-02"
  });
  assert.equal(limited.totalCount, 1);
  assert.equal(limited.limitedSample, true);

  const unknown = buildWeeklyDomainInput(fixture(), {
    domainId: "missing", domainName: "Missing", locale: "en", endDate: "2026-03-02"
  });
  assert.equal(unknown.totalCount, 0);
});

test("七天窗口跨年且保留显式空正文和正文空白", () => {
  const result = buildWeeklyDomainInput(fixture({
    entries: [
      { id: "year-start", date: "2026-12-26", time: "", content: "", categoryId: "health-note" },
      { id: "year-end", date: "2027-01-01", time: "08:00", content: "  原样正文  ", categoryId: "health-note" }
    ]
  }), {
    domainId: "health",
    domainName: "健康",
    locale: "zh-CN",
    endDate: "2027-01-01"
  });
  assert.equal(result.windowStart, "2026-12-26");
  assert.deepEqual(result.entries.map((entry) => entry.content), ["  原样正文  ", ""]);
  assert.equal(sanitizeDomainReviewInput({
    windowStart: result.windowStart,
    windowEnd: result.windowEnd,
    domainName: result.domainName,
    locale: result.locale,
    entries: result.entries
  }).entries[0].content, "  原样正文  ");
});

test("七天选择器排除非法或非字符串时间，但保留缺省空时间", () => {
  const result = buildWeeklyDomainInput(fixture({
    entries: [
      { id: "empty", date: "2026-03-02", content: "无时间", categoryId: "health-note" },
      { id: "midnight", date: "2026-03-02", time: "00:00", content: "合法时间", categoryId: "health-note" },
      { id: "hour", date: "2026-03-02", time: "24:00", content: "非法小时", categoryId: "health-note" },
      { id: "malformed", date: "2026-03-02", time: "8:00", content: "格式错误", categoryId: "health-note" },
      { id: "number", date: "2026-03-02", time: 830, content: "类型错误", categoryId: "health-note" }
    ]
  }), {
    domainId: "health", domainName: "健康", locale: "zh-CN", endDate: "2026-03-02"
  });

  assert.deepEqual(result.entries.map((entry) => [entry.id, entry.time]), [
    ["midnight", "00:00"],
    ["empty", ""]
  ]);
});

test("服务端输入拒绝多余字段、非七天窗口、非法时间、重复 ID 与超限正文", () => {
  const safe = buildWeeklyDomainInput(fixture(), {
    domainId: "health", domainName: "健康", locale: "zh-CN", endDate: "2026-03-02"
  });
  const request = {
    windowStart: safe.windowStart,
    windowEnd: safe.windowEnd,
    domainName: safe.domainName,
    locale: safe.locale,
    entries: safe.entries
  };
  assert.deepEqual(sanitizeDomainReviewInput(request), request);

  const invalid = [
    { ...request, accountId: "forbidden" },
    { ...request, windowStart: "2026-02-25" },
    { ...request, entries: [{ ...request.entries[0], time: "24:00" }] },
    { ...request, entries: [request.entries[0], request.entries[0]] },
    { ...request, entries: [{ ...request.entries[0], content: "字".repeat(4_001) }] },
    { ...request, entries: [{ ...request.entries[0], tags: ["forbidden"] }] },
    { ...request, windowStart: "0001-01-01", windowEnd: "0001-01-07" }
  ];
  for (const candidate of invalid) {
    assert.throws(() => sanitizeDomainReviewInput(candidate), (error) => error.code === "AI_DOMAIN_REVIEW_INPUT_INVALID");
  }
});

test("模型输出只接受本次 ID、唯一短主题和服务器元数据", () => {
  const input = sanitizeDomainReviewInput({
    windowStart: "2026-02-24",
    windowEnd: "2026-03-02",
    domainName: "健康",
    locale: "zh-CN",
    entries: [
      { id: "a", date: "2026-03-01", time: "08:00", content: "睡眠", sourceType: "ordinary" },
      { id: "b", date: "2026-03-02", time: "09:00", content: "散步", sourceType: "periodic" }
    ]
  });
  const result = normalizeDomainReviewOutput({
    overview: "这一周主要记录了睡眠与散步。样本只反映已写下的内容。",
    themes: [
      { title: "休息", summary: "记录提到睡眠。", entryIds: ["a"] },
      { title: "活动", summary: "记录提到散步。", entryIds: ["b"] }
    ]
  }, input, 42, "deepseek:test");
  assert.equal(result.providerId, "deepseek:test");
  assert.equal(result.generatedAt, 42);
  assert.deepEqual(validateDomainReviewResponse(result, input), result);

  const rejected = [
    { overview: "有效。", themes: [{ title: "伪造", summary: "无效。", entryIds: ["outside"] }] },
    { overview: "有效。", themes: [
      { title: "重复", summary: "第一条。", entryIds: ["a"] },
      { title: "重复", summary: "第二条。", entryIds: ["b"] }
    ] },
    { overview: "字".repeat(500), themes: [] },
    { overview: "有效。", themes: [{ title: "主题", summary: "字".repeat(221), entryIds: ["a"] }] }
  ];
  for (const candidate of rejected) {
    assert.throws(() => normalizeDomainReviewOutput(candidate, input), (error) => error.code === "AI_DOMAIN_REVIEW_RESPONSE_INVALID");
  }
});

test("投资领域的买卖、标的、价格、仓位、收益与预测输出整份拒绝", () => {
  const input = sanitizeDomainReviewInput({
    windowStart: "2026-02-24",
    windowEnd: "2026-03-02",
    domainName: "投资",
    locale: "zh-CN",
    entries: [{ id: "trade", date: "2026-03-02", time: "15:00", content: "记录收盘观察", sourceType: "ordinary" }]
  });
  for (const unsafe of [
    "建议买入。",
    "可以加仓。",
    "收益会提高。",
    "市场预测向上。",
    "等待更好的时机。",
    "调整组合配置。",
    "Set a price target.",
    "Sell this position.",
    "Consider market timing.",
    "Match the portfolio to risk tolerance."
  ]) {
    assert.throws(() => normalizeDomainReviewOutput({ overview: unsafe, themes: [] }, input), (error) => error.code === "AI_DOMAIN_REVIEW_UNSAFE");
  }
});

test("股票、基金与证券领域及常见投资动作同样触发安全拒绝", () => {
  for (const [domainName, unsafe] of [
    ["股票", "推荐买。"],
    ["基金", "预测接下来会上涨。"],
    ["证券", "卖。"],
    ["Stock journal", "This looks bullish."],
    ["Funds", "Expect higher returns."]
  ]) {
    const input = sanitizeDomainReviewInput({
      windowStart: "2026-02-24",
      windowEnd: "2026-03-02",
      domainName,
      locale: domainName === "Funds" ? "en" : "zh-CN",
      entries: [{ id: "trade", date: "2026-03-02", time: "15:00", content: "收盘记录", sourceType: "ordinary" }]
    });
    assert.throws(
      () => normalizeDomainReviewOutput({ overview: unsafe, themes: [] }, input),
      (error) => error.code === "AI_DOMAIN_REVIEW_UNSAFE"
    );
  }
});

test("普通领域同样拒绝诊断、因果断言、评分与自动建议", () => {
  const input = sanitizeDomainReviewInput({
    windowStart: "2026-02-24",
    windowEnd: "2026-03-02",
    domainName: "健康",
    locale: "zh-CN",
    entries: [{ id: "health", date: "2026-03-02", time: "08:00", content: "昨晚睡眠较早", sourceType: "ordinary" }]
  });
  for (const unsafe of [
    "建议早点休息。",
    "推荐早点休息。",
    "这说明你状态很好。",
    "因为工作忙，所以睡得少。",
    "睡眠不足与压力有关。",
    "你可能有焦虑。",
    "你有焦虑。",
    "你需要休息。",
    "行为评分为八分。",
    "You should sleep earlier.",
    "This may indicate anxiety.",
    "You have anxiety.",
    "Work caused poor sleep.",
    "Work leads to poor sleep.",
    "This results in anxiety."
  ]) {
    assert.throws(() => normalizeDomainReviewOutput({ overview: unsafe, themes: [] }, input), (error) => error.code === "AI_DOMAIN_REVIEW_UNSAFE");
  }
});
