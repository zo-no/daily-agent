import test from "node:test";
import assert from "node:assert/strict";
import {
  agentCategoryResolution,
  createLocalAgentReview,
  createLocalPlanAgentReview,
  mergePlanUpdateProposal,
  normalizeAgentReplyOutput,
  normalizeAgentReviewOutput,
  normalizePlanAgentReplyOutput,
  normalizePlanAgentReviewOutput,
  reconcileAgentReviewItems
} from "../src/lib/agent-review-model.mjs";

const input = {
  entries: [
    { id: "short", time: "09:37", content: "早早的便出现了分化", currentCategoryId: "daily" },
    { id: "clear", time: "10:20", content: "完成登录回归并记录了失败原因和修复结果", currentCategoryId: "study" }
  ],
  categories: [
    { id: "daily", domainName: "日常", name: "记录" },
    { id: "study", domainName: "学习", name: "学习记录" },
    { id: "trading", domainName: "交易", name: "市场" }
  ]
};

test("Agent review drops unknown records/categories, deduplicates rows and bounds text", () => {
  const result = normalizeAgentReviewOutput({
    intro: " 今天有 1 处可以再说清楚。 ",
    items: [
      { entryId: "short", kind: "question", prompt: "这里的分化具体指什么变化？", proposedAppend: "x".repeat(600) },
      { entryId: "short", kind: "note", prompt: "重复" },
      { entryId: "outside", kind: "question", prompt: "越权" },
      { entryId: "clear", kind: "category", categoryId: "outside", prompt: "坏分类" },
      { entryId: "clear", kind: "category", categoryId: "trading", prompt: "更像交易 / 市场" }
    ]
  }, input, 10, "deepseek:test");

  assert.equal(result.intro, "今天有 1 处可以再说清楚。");
  assert.deepEqual(result.items.map((item) => [item.entryId, item.kind]), [["short", "question"], ["clear", "category"]]);
  assert.equal(result.items[0].proposedAppend.length, 400);
  assert.equal(result.items[1].categoryId, "trading");
  assert.deepEqual(result.analyzedEntryIds, ["short", "clear"]);
});

test("local review asks about vague short notes and only suggests existing non-current categories", () => {
  const result = createLocalAgentReview(input, { locale: "zh-CN", generatedAt: 20 });
  assert.equal(result.providerId, "local-agent-review-v1");
  assert.ok(result.items.some((item) => item.entryId === "short" && item.kind === "question"));
  assert.ok(result.items.every((item) => input.entries.some((entry) => entry.id === item.entryId)));
  assert.ok(result.items.filter((item) => item.kind === "category").every((item) => input.categories.some((category) => category.id === item.categoryId)));
  const categoryItem = result.items.find((item) => item.kind === "category");
  assert.equal(categoryItem.prompt, "这条记录需要归到这个分类吗？");
  assert.equal(categoryItem.prompt.includes("交易"), false);
  assert.equal(categoryItem.prompt.includes("市场"), false);
});

test("category prompts are normalized separately from the visible category path", () => {
  const zh = normalizeAgentReviewOutput({
    items: [{ entryId: "clear", kind: "category", categoryId: "trading", prompt: "这条记录更像交易 / 市场，要归到这里吗？" }]
  }, { ...input, locale: "zh-CN" }, 21, "deepseek:test");
  const en = normalizeAgentReviewOutput({
    items: [{ entryId: "clear", kind: "category", categoryId: "trading", prompt: "This note looks closer to Trading / Market. File it there?" }]
  }, { ...input, locale: "en" }, 22, "deepseek:test");
  assert.equal(zh.items[0].prompt, "这条记录需要归到这个分类吗？");
  assert.equal(en.items[0].prompt, "File this note in the suggested category?");
});

test("Diary Agent drops no-op category suggestions and resolves stale same-category actions", () => {
  const entries = [
    { id: "same", categoryId: "daily" },
    { id: "move", categoryId: "daily" }
  ];
  const items = [
    { id: "same-category", entryId: "same", kind: "category", categoryId: "daily" },
    { id: "valid-category", entryId: "move", kind: "category", categoryId: "trading" },
    { id: "question", entryId: "same", kind: "question", categoryId: "" },
    { id: "unknown-entry", entryId: "outside", kind: "question", categoryId: "" }
  ];

  assert.deepEqual(
    reconcileAgentReviewItems(items, entries, input.categories).map((item) => item.id),
    ["valid-category", "question"]
  );
  assert.equal(agentCategoryResolution(entries[0], "daily", input.categories), "already-current");
  assert.equal(agentCategoryResolution(entries[1], "trading", input.categories), "apply");
  assert.equal(agentCategoryResolution(entries[1], "outside", input.categories), "invalid");
});

test("reply normalization never turns conversation into an automatic write", () => {
  const reply = normalizeAgentReplyOutput({
    reply: "明白了，这个细节能让记录更完整。",
    proposedAppend: "具体是开盘后高低位方向快速拉开。",
    action: "append"
  });
  assert.deepEqual(reply, {
    reply: "明白了，这个细节能让记录更完整。",
    proposedAppend: "具体是开盘后高低位方向快速拉开。"
  });
  assert.equal("action" in reply, false);
});

test("explicit append preserves the source bytes before the new paragraph", () => {
  const source = "原文末尾保留空格  ";
  const detail = "补充事实";
  const appended = `${source}${source.endsWith("\n\n") ? "" : source.endsWith("\n") ? "\n" : "\n\n"}${detail.trim()}`;
  assert.equal(appended.slice(0, source.length), source);
  assert.equal(appended, "原文末尾保留空格  \n\n补充事实");
});

const planInput = {
  reviewTarget: "plan",
  date: "2026-08-23",
  locale: "zh-CN",
  plans: [
    { id: "local-a", title: "处理一下", startMinute: 540, endMinute: 600 },
    { id: "local-b", title: "写发布说明", startMinute: 570, endMinute: 630 }
  ],
  conflicts: [{ title: "团队会议", startMinute: 660, endMinute: 720 }]
};

test("local Plan review prioritizes overlaps and only targets allowlisted local plans", () => {
  const result = createLocalPlanAgentReview(planInput, { locale: "zh-CN", generatedAt: 30 });
  assert.equal(result.providerId, "local-plan-agent-review-v1");
  assert.deepEqual(result.analyzedPlanIds, ["local-a", "local-b"]);
  assert.ok(result.items.some((item) => item.planId === "local-a" && item.kind === "plan-overlap"));
  assert.ok(result.items.every((item) => planInput.plans.some((plan) => plan.id === item.planId)));
  assert.equal(new Set(result.items.map((item) => item.planId)).size, result.items.length);
});

test("Plan review normalizes local IDs and rejects invalid or executable proposal fields", () => {
  const result = normalizePlanAgentReviewOutput({
    intro: " 有两个计划值得确认。 ",
    items: [
      { planId: "local-a", kind: "plan-question", prompt: "这项具体要完成什么？", proposal: { planId: "local-a", title: "完成接口检查", source: "google" } },
      { planId: "local-a", kind: "plan-time", prompt: "重复计划" },
      { planId: "google-event", kind: "plan-overlap", prompt: "越权", proposal: { planId: "google-event", startMinute: 600, endMinute: 660 } },
      { planId: "local-b", kind: "plan-time", prompt: "建议挪到会后", proposal: { planId: "local-b", startMinute: 720, endMinute: 780, date: "2026-08-24" } }
    ]
  }, planInput, 40, "deepseek:test");

  assert.equal(result.intro, "有两个计划值得确认。");
  assert.deepEqual(result.items.map((item) => [item.planId, item.kind]), [["local-a", "plan-question"], ["local-b", "plan-time"]]);
  assert.deepEqual(result.items[0].proposal, { planId: "local-a", title: "完成接口检查" });
  assert.deepEqual(result.items[1].proposal, { planId: "local-b", startMinute: 720, endMinute: 780 });
  assert.equal("source" in result.items[0].proposal, false);
  assert.equal("date" in result.items[1].proposal, false);
});

test("Plan reply normalization keeps a proposal inert and bound to the active local plan", () => {
  const result = normalizePlanAgentReplyOutput({
    reply: "可以改成更明确的标题。",
    proposal: { planId: "local-a", title: "完成接口检查", action: "update", startMinute: 900 }
  }, planInput, "local-a");
  assert.deepEqual(result, {
    reply: "可以改成更明确的标题。",
    proposal: { planId: "local-a", title: "完成接口检查" }
  });
});

test("confirmed Plan proposal merges only validated changed fields", () => {
  const current = {
    id: "local-a",
    date: "2026-08-23",
    title: "处理一下",
    startTime: "09:00",
    endTime: "10:00",
    source: "local",
    flexibility: "fixed",
    externalRef: null,
    createdAt: 1,
    updatedAt: 2
  };
  const merged = mergePlanUpdateProposal(current, {
    planId: "local-a",
    title: "完成接口检查",
    startMinute: 630,
    endMinute: 690
  }, "2026-08-23");
  assert.deepEqual(merged, { ...current, title: "完成接口检查", startTime: "10:30", endTime: "11:30" });
  assert.equal(mergePlanUpdateProposal(current, { planId: "outside", title: "越权" }, "2026-08-23"), null);
  assert.equal(mergePlanUpdateProposal({ ...current, source: "google" }, { planId: "local-a", title: "越权" }, "2026-08-23"), null);
  assert.equal(mergePlanUpdateProposal(current, { planId: "local-a", startMinute: 700, endMinute: 600 }, "2026-08-23"), null);
});
