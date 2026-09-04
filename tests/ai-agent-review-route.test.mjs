import test from "node:test";
import assert from "node:assert/strict";
import { MAX_AI_BODY_BYTES } from "../src/shared/ai/http-boundary.mjs";
import { createRemoteAgentReviewProvider } from "../src/modules/assistant/review/client.mjs";
import {
  agentWithDeepSeek,
  postAgentReview,
  sanitizeAgentReviewInput
} from "../src/modules/assistant/review/server.mjs";

const URL = "http://localhost:3100/api/organize/agent";
const body = {
  mode: "analyze",
  date: "2026-08-22",
  locale: "zh-CN",
  entries: [{ id: "a", time: "09:37", content: "早早的便出现了分化", tags: ["不发送"] }],
  categories: [{ id: "daily", domainName: "日常", name: "记录", private: true }],
  account: "must-not-leave"
};

const planBody = {
  reviewTarget: "plan",
  mode: "analyze",
  date: "2026-08-23",
  locale: "zh-CN",
  plans: [{ id: "local-a", title: "处理一下", startMinute: 540, endMinute: 600, externalRef: { eventId: "must-not-leave" } }],
  conflicts: [{ id: "google-event", calendarId: "private", title: "团队会议", startMinute: 570, endMinute: 630, location: "不发送" }],
  token: "must-not-leave"
};

function request(value, headers = {}) {
  return new Request(URL, {
    method: "POST",
    headers: { authorization: "Bearer valid-token", "content-type": "application/json", ...headers },
    body: typeof value === "string" ? value : JSON.stringify(value)
  });
}

function openAiResponse(value) {
  return new Response(JSON.stringify({
    id: "chatcmpl-route-test",
    object: "chat.completion",
    created: 1,
    model: "test-model",
    choices: [{
      index: 0,
      message: { role: "assistant", content: JSON.stringify(value) },
      finish_reason: "stop"
    }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("Agent input keeps only bounded selected-day review fields", () => {
  const safe = sanitizeAgentReviewInput(body);
  assert.deepEqual(Object.keys(safe).sort(), ["categories", "date", "entries", "locale", "mode"]);
  assert.deepEqual(Object.keys(safe.entries[0]).sort(), ["content", "currentCategoryId", "id", "time"]);
  assert.deepEqual(Object.keys(safe.categories[0]).sort(), ["domainName", "id", "name"]);
});

test("Agent reply input keeps a bounded question goal and only allowlisted candidate categories", () => {
  const safe = sanitizeAgentReviewInput({
    mode: "reply",
    date: "2026-08-22",
    locale: "zh-CN",
    entries: [{ id: "a", time: "09:37", content: "学习和市场复盘", currentCategoryId: "daily" }],
    categories: [
      { id: "daily", domainName: "日常", name: "记录" },
      { id: "study", domainName: "成长", name: "学习" },
      { id: "trading", domainName: "投资", name: "交易" }
    ],
    activeEntryId: "a",
    item: {
      kind: "question",
      prompt: "这条记录主要属于哪类活动？",
      questionGoal: "clarify-category",
      candidateCategoryIds: ["study", "outside", "trading", "study"]
    },
    messages: [{ role: "user", content: "主要是交易复盘" }]
  });
  assert.deepEqual(safe.item, {
    kind: "question",
    prompt: "这条记录主要属于哪类活动？",
    categoryId: "",
    questionGoal: "clarify-category",
    candidateCategoryIds: ["study", "trading"]
  });
});

test("Plan Agent input keeps local plan fields and identity-free Google conflict context", () => {
  const safe = sanitizeAgentReviewInput(planBody);
  assert.deepEqual(Object.keys(safe).sort(), ["conflicts", "date", "locale", "mode", "plans", "reviewTarget"]);
  assert.deepEqual(Object.keys(safe.plans[0]).sort(), ["endMinute", "id", "startMinute", "title"]);
  assert.deepEqual(Object.keys(safe.conflicts[0]).sort(), ["endMinute", "startMinute", "title"]);
  assert.equal(JSON.stringify(safe).includes("google-event"), false);
  assert.equal(JSON.stringify(safe).includes("calendarId"), false);
});

test("DeepSeek adapter routes both Diary and Plan through the shared Mastra boundary", async () => {
  const requestedBodies = [];
  const outputs = [
    {
      intro: "需要补充一条信息。",
      items: [{
        entryId: "a",
        kind: "question",
        prompt: "这次分化发生在什么场景？",
        questionGoal: "enrich-detail"
      }]
    },
    { intro: "计划没有需要处理的问题。", items: [] }
  ];
  const fetchImpl = async (_url, options) => {
    requestedBodies.push(JSON.parse(options.body));
    return openAiResponse(outputs[requestedBodies.length - 1]);
  };

  const diaryResult = await agentWithDeepSeek(sanitizeAgentReviewInput(body), {
    apiKey: "test-key",
    baseUrl: "https://example.invalid/v1",
    fetchImpl,
    model: "test-model",
    now: () => 123
  });
  const planResult = await agentWithDeepSeek(sanitizeAgentReviewInput(planBody), {
    apiKey: "test-key",
    baseUrl: "https://example.invalid/v1",
    fetchImpl,
    model: "test-model",
    now: () => 456
  });

  assert.equal(requestedBodies.length, 2);
  assert.equal(diaryResult.providerId, "deepseek:test-model");
  assert.equal(diaryResult.items[0].questionGoal, "enrich-detail");
  assert.equal(planResult.providerId, "deepseek:test-model");
  assert.deepEqual(planResult.items, []);
});

test("Mastra transport errors retain the existing public rate-limit code without retries", async () => {
  let calls = 0;
  await assert.rejects(
    () => agentWithDeepSeek(sanitizeAgentReviewInput(body), {
      apiKey: "test-key",
      baseUrl: "https://example.invalid/v1",
      model: "test-model",
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify({ error: { message: "rate limited" } }), {
          status: 429,
          headers: { "content-type": "application/json" }
        });
      }
    }),
    (error) => error?.code === "AI_RATE_LIMITED" && error?.status === 429
  );
  assert.equal(calls, 1);
});

test("Mastra schema failures retain the existing invalid-response code", async () => {
  await assert.rejects(
    () => agentWithDeepSeek(sanitizeAgentReviewInput(body), {
      apiKey: "test-key",
      baseUrl: "https://example.invalid/v1",
      model: "test-model",
      fetchImpl: async () => openAiResponse({ unexpected: true })
    }),
    (error) => error?.code === "AI_RESPONSE_INVALID" && error?.status === 502
  );
});

test("Agent API inherits origin, JSON, account, size and rate boundaries", async () => {
  const analyze = async (safe) => ({ providerId: "test", intro: "", items: [], analyzedEntryIds: safe.entries.map((entry) => entry.id), generatedAt: 1 });
  const ok = await postAgentReview(request(body, { origin: "http://localhost:3100" }), {
    verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
    analyze
  });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).providerId, "test");

  const cases = [
    [request(body, { origin: "https://example.com" }), 403, "AI_ORIGIN_FORBIDDEN"],
    [request(body, { "content-type": "text/plain" }), 415, "AI_CONTENT_TYPE_REQUIRED"],
    [new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), 401, "AI_AUTH_REQUIRED"],
    [request(body, { authorization: "Bearer invalid" }), 401, "AI_AUTH_INVALID"],
    [request("{}", { "content-length": String(MAX_AI_BODY_BYTES + 1) }), 413, "AI_BODY_TOO_LARGE"]
  ];
  for (const [candidate, status, code] of cases) {
    const response = await postAgentReview(candidate, {
      verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
      analyze
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
});

test("browser provider sends minimal fields and falls back locally without a token", async () => {
  let sent;
  const remote = createRemoteAgentReviewProvider({
    getAccessToken: () => "token",
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({ providerId: "deepseek:test", intro: "", items: [], analyzedEntryIds: ["a"], generatedAt: 1 }), { status: 200 });
    }
  });
  await remote.analyze(body);
  assert.deepEqual(Object.keys(sent).sort(), ["categories", "date", "entries", "locale", "mode"]);
  assert.deepEqual(Object.keys(sent.entries[0]).sort(), ["content", "currentCategoryId", "id", "time"]);

  const local = createRemoteAgentReviewProvider({ getAccessToken: () => "" });
  const fallback = await local.analyze(body);
  assert.equal(fallback.providerId, "local-agent-review-v1");
  assert.ok(fallback.fallbackReason);
});

test("browser provider carries classification context and local fallback converges or stops safely", async () => {
  let sent;
  const value = {
    mode: "reply",
    date: "2026-08-22",
    locale: "zh-CN",
    entries: [{ id: "a", time: "09:37", content: "学习和市场复盘", currentCategoryId: "daily" }],
    categories: [
      { id: "daily", domainName: "日常", name: "记录" },
      { id: "study", domainName: "成长", name: "学习" },
      { id: "trading", domainName: "投资", name: "交易" }
    ],
    activeEntryId: "a",
    item: {
      kind: "question",
      prompt: "这条记录主要属于哪类活动？",
      questionGoal: "clarify-category",
      candidateCategoryIds: ["study", "trading"]
    },
    messages: [{ role: "user", content: "主要是交易复盘" }]
  };
  const remote = createRemoteAgentReviewProvider({
    getAccessToken: () => "token",
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({ outcome: "category", reply: "可以归档。", categoryId: "trading" }), { status: 200 });
    }
  });
  const remoteResult = await remote.reply(value);
  assert.deepEqual(sent.item.candidateCategoryIds, ["study", "trading"]);
  assert.equal(sent.item.questionGoal, "clarify-category");
  assert.equal(remoteResult.outcome, "category");
  assert.equal(remoteResult.categoryId, "trading");

  const local = createRemoteAgentReviewProvider({ getAccessToken: () => "" });
  const resolved = await local.reply(value);
  assert.equal(resolved.outcome, "category");
  assert.equal(resolved.categoryId, "trading");

  const ask = await local.reply({ ...value, messages: [{ role: "user", content: "还不确定" }] });
  assert.equal(ask.outcome, "ask");
  assert.equal(ask.terminal, false);

  const stopped = await local.reply({
    ...value,
    messages: [
      { role: "user", content: "还不确定" },
      { role: "assistant", content: "可以说主要对象吗？" },
      { role: "user", content: "还是不确定" }
    ]
  });
  assert.equal(stopped.outcome, "none");
  assert.equal(stopped.terminal, true);
});

test("browser provider sends minimal Plan fields and uses Plan fallback without a token", async () => {
  let sent;
  const remote = createRemoteAgentReviewProvider({
    getAccessToken: () => "token",
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({ providerId: "deepseek:test", intro: "", items: [], analyzedPlanIds: ["local-a"], generatedAt: 1 }), { status: 200 });
    }
  });
  await remote.analyze(planBody);
  assert.deepEqual(Object.keys(sent).sort(), ["conflicts", "date", "locale", "mode", "plans", "reviewTarget"]);
  assert.deepEqual(Object.keys(sent.plans[0]).sort(), ["endMinute", "id", "startMinute", "title"]);
  assert.deepEqual(Object.keys(sent.conflicts[0]).sort(), ["endMinute", "startMinute", "title"]);

  const local = createRemoteAgentReviewProvider({ getAccessToken: () => "" });
  const fallback = await local.analyze(planBody);
  assert.equal(fallback.providerId, "local-plan-agent-review-v1");
  assert.ok(fallback.fallbackReason);

  const reply = await local.reply({
    ...planBody,
    mode: "reply",
    activePlanId: "local-a",
    item: { kind: "plan-overlap", prompt: "调整时间吗？" },
    messages: [{ role: "user", content: "改到 10:30-11:30" }]
  });
  assert.deepEqual(reply.proposal, { planId: "local-a", startMinute: 630, endMinute: 690 });
});
