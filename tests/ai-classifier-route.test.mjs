import test from "node:test";
import assert from "node:assert/strict";
import { AI_TIMEOUT_MS, MAX_AI_BODY_BYTES, MAX_AI_CONTENT_CHARS, MAX_AI_ENTRIES, MAX_AI_EXAMPLES } from "../src/shared/ai/http-boundary.mjs";
import { createAiRateLimiter } from "../src/shared/ai/rate-limit.mjs";
import { analyzeWithDeepSeek, normalizeAiClassifierOutput, postAiClassifier, sanitizeAiClassifierInput } from "../src/modules/organize/classification/server.mjs";
import { createRemoteClassifierProvider } from "../src/modules/organize/classification/client.mjs";

const URL = "http://localhost:3100/api/organize/analyze";
const categories = [
  { id: "daily", name: "记录", domainId: "daily-domain", domainName: "日常", hints: ["随手记"] },
  { id: "health-food", name: "饮食", domainId: "health-domain", domainName: "健康", hints: ["早餐", "午餐", "晚餐"] },
  { id: "study", name: "学习记录", domainId: "learning-domain", domainName: "学习", hints: ["课程", "读书"] },
  { id: "trading", name: "市场", domainId: "trading-domain", domainName: "交易", hints: ["投资", "仓位"] }
];
const input = {
  entries: [
    { id: "a", content: "完成课程复盘并整理学习笔记", currentCategoryId: "daily" },
    { id: "b", content: "早餐吃了鸡蛋", currentCategoryId: "daily" }
  ],
  examples: [{ id: "old", content: "项目课程学习", categoryId: "study" }],
  categories
};

function request(body, headers = {}) {
  return new Request(URL, {
    method: "POST",
    headers: {
      authorization: "Bearer valid-token",
      "content-type": "application/json",
      ...headers
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

function deepSeekResponse(content, status = 200) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status,
    headers: { "content-type": "application/json" }
  });
}

test("服务端输入只保留有界记录、现有分类和 24 条分类历史示例", () => {
  const raw = {
    categories: [...categories, categories[1], { id: "", name: "坏分类" }],
    entries: Array.from({ length: MAX_AI_ENTRIES + 5 }, (_, index) => ({
      id: `entry-${index}`,
      content: index === 0 ? "x".repeat(MAX_AI_CONTENT_CHARS + 50) : `记录 ${index}`,
      currentCategoryId: index % 2 ? "daily" : "outside",
      email: "must-not-leave-route"
    })),
    examples: Array.from({ length: MAX_AI_EXAMPLES + 5 }, (_, index) => ({
      id: `example-${index}`,
      content: `历史 ${index}`,
      categoryId: index === 0 ? "outside" : "study",
      privateField: "must-not-leave-route"
    }))
  };
  const result = sanitizeAiClassifierInput(raw);
  assert.equal(result.entries.length, MAX_AI_ENTRIES);
  assert.equal(result.entries[0].content.length, MAX_AI_CONTENT_CHARS);
  assert.equal(result.entries[0].currentCategoryId, "");
  assert.deepEqual(Object.keys(result.entries[0]).sort(), ["content", "currentCategoryId", "id"]);
  assert.equal(result.examples.length, MAX_AI_EXAMPLES);
  assert.ok(result.examples.every((entry) => result.categories.some((category) => category.id === entry.categoryId)));
  assert.deepEqual(result.categories.map((category) => category.id), categories.map((category) => category.id));
  assert.deepEqual(Object.keys(result.categories[0]).sort(), ["domainId", "domainName", "hints", "id", "name"]);
});

test("模型输出只能引用当次记录和现有分类，每条记录最多选择一个非当前分类", () => {
  const normalized = normalizeAiClassifierOutput({
    groups: [
      { categoryId: "study", confidence: "medium", entries: [{ entryId: "a", score: 0.78, evidence: ["课程"] }, { entryId: "outside", score: 1 }] },
      { categoryId: "trading", confidence: "high", entries: [{ entryId: "a", score: 0.96, evidence: ["越权的第二分类"] }] },
      { categoryId: "health-food", confidence: "high", entries: [{ entryId: "b", score: 0.94, evidence: ["早餐"] }] },
      { categoryId: "daily", confidence: "high", entries: [{ entryId: "b", score: 1 }] },
      { categoryId: "missing", confidence: "high", entries: [{ entryId: "b", score: 1 }] },
      { categoryId: "study", confidence: "low", entries: [{ entryId: "b", score: 1 }] }
    ]
  }, input, 123, "deepseek:test");
  assert.equal(normalized.providerId, "deepseek:test");
  assert.equal(normalized.generatedAt, 123);
  assert.deepEqual(normalized.groups.map((group) => group.categoryId), ["health-food", "trading"]);
  assert.equal(normalized.groups.flatMap((group) => group.entries).filter((entry) => entry.entryId === "a").length, 1);
  assert.equal(normalized.groups.find((group) => group.categoryId === "trading").entries[0].entryId, "a");
  assert.ok(normalized.groups.flatMap((group) => group.entries).every((entry) => entry.reason === "ai-semantic"));
  assert.deepEqual(normalized.unmatchedEntryIds, []);
});

test("DeepSeek 请求要求 categoryId JSON，且不接受损坏的模型 JSON", async () => {
  let captured;
  const result = await analyzeWithDeepSeek(input, {
    apiKey: "server-secret",
    model: "deepseek-chat",
    now: () => 456,
    fetchImpl: async (url, options) => {
      captured = { url, options };
      return deepSeekResponse(JSON.stringify({
        groups: [{ categoryId: "study", confidence: "high", entries: [{ entryId: "a", score: 0.94, evidence: ["课程复盘"] }] }]
      }));
    }
  });
  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.equal(new Headers(captured.options.headers).get("authorization"), "Bearer server-secret");
  const body = JSON.parse(captured.options.body);
  assert.deepEqual(body.response_format, { type: "json_object" });
  assert.match(body.messages[0].content, /existing categories/);
  assert.match(body.messages[0].content, /categoryId/);
  assert.doesNotMatch(body.messages[0].content, /new tags per entry/);
  assert.equal(result.providerId, "deepseek:deepseek-chat");
  assert.deepEqual(result.unmatchedEntryIds, ["b"]);

  await assert.rejects(() => analyzeWithDeepSeek(input, {
    apiKey: "server-secret",
    fetchImpl: async () => deepSeekResponse("not-json")
  }), (error) => error.code === "AI_RESPONSE_INVALID" && error.status === 502);
});

test("DeepSeek 限流和超时转换为稳定错误，不泄露上游响应", async () => {
  await assert.rejects(() => analyzeWithDeepSeek(input, {
    apiKey: "server-secret",
    fetchImpl: async () => new Response("private upstream detail", { status: 429 })
  }), (error) => error.code === "AI_RATE_LIMITED" && error.status === 429);

  await assert.rejects(() => analyzeWithDeepSeek(input, {
    apiKey: "server-secret",
    timeoutMs: 5,
    fetchImpl: (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    })
  }), (error) => error.code === "AI_TIMEOUT" && error.status === 504);
  assert.equal(AI_TIMEOUT_MS, 20_000);
});

test("API Route 校验同源、JSON、账号、请求大小和用户限流", async () => {
  const analyze = async (safeInput) => normalizeAiClassifierOutput({ groups: [] }, safeInput, 1, "test");
  const ok = await postAiClassifier(request(input, { origin: "http://localhost:3100" }), {
    verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
    analyze
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await ok.json()).providerId, "test");

  const forwardedHost = await postAiClassifier(request(input, {
    origin: "http://127.0.0.1:3100",
    host: "127.0.0.1:3100"
  }), {
    verifyAccessToken: async () => ({ id: "user-1" }),
    analyze
  });
  assert.equal(forwardedHost.status, 200);

  const cases = [
    [request(input, { origin: "https://example.com" }), 403, "AI_ORIGIN_FORBIDDEN"],
    [request(input, { "content-type": "text/plain" }), 415, "AI_CONTENT_TYPE_REQUIRED"],
    [new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), 401, "AI_AUTH_REQUIRED"],
    [request(input, { authorization: "Bearer invalid" }), 401, "AI_AUTH_INVALID"],
    [request("{}", { "content-length": String(MAX_AI_BODY_BYTES + 1) }), 413, "AI_BODY_TOO_LARGE"],
    [request("{broken"), 400, "AI_JSON_INVALID"]
  ];
  for (const [candidate, status, code] of cases) {
    const response = await postAiClassifier(candidate, {
      verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
      analyze
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }

  let now = 1000;
  const rateLimit = createAiRateLimiter({ limit: 1, windowMs: 100, now: () => now });
  assert.equal(rateLimit("user-1"), true);
  assert.equal(rateLimit("user-1"), false);
  now += 101;
  assert.equal(rateLimit("user-1"), true);
});

test("浏览器 provider 只发送分类所需字段和均衡历史示例，远端失败按 categoryId 降级", async () => {
  const allEntries = [
    ...input.entries.map((entry) => ({ ...entry, categoryId: entry.currentCategoryId, tags: ["不应发送"] })),
    ...Array.from({ length: 30 }, (_, index) => ({
      id: `history-study-${index}`,
      content: `课程学习记录 ${index}`,
      categoryId: "study",
      createdAt: 100 - index,
      privateField: "must-not-leave-browser"
    })),
    ...Array.from({ length: 8 }, (_, index) => ({
      id: `history-food-${index}`,
      content: `早餐饮食记录 ${index}`,
      categoryId: "health-food",
      createdAt: 50 - index
    }))
  ];
  let sent;
  const remote = createRemoteClassifierProvider({
    getAccessToken: () => "access-token",
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({
        providerId: "deepseek:test",
        groups: [],
        unmatchedEntryIds: ["a", "b"],
        analyzedEntryIds: ["a", "b"],
        generatedAt: 1
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  const result = await remote.analyze({ entries: input.entries.map((entry) => ({ ...entry, categoryId: entry.currentCategoryId })), allEntries, categories });
  assert.equal(result.providerId, "deepseek:test");
  assert.equal(sent.examples.length, 24);
  assert.ok(sent.examples.some((entry) => entry.categoryId === "study"));
  assert.ok(sent.examples.some((entry) => entry.categoryId === "health-food"));
  assert.ok(sent.examples.every((entry) => Object.keys(entry).sort().join(",") === "categoryId,content,id"));
  assert.deepEqual(Object.keys(sent.entries[0]).sort(), ["content", "currentCategoryId", "id"]);
  assert.deepEqual(Object.keys(sent.categories[0]).sort(), ["domainId", "domainName", "hints", "id", "name"]);

  const fallback = createRemoteClassifierProvider({
    getAccessToken: () => "access-token",
    fetchImpl: async () => new Response("unavailable", { status: 503 })
  });
  const fallbackResult = await fallback.analyze({
    entries: [{ id: "a", content: "早餐吃了鸡蛋和豆浆", categoryId: "daily", tags: [] }],
    allEntries,
    categories
  });
  assert.equal(fallbackResult.providerId, "local-rules-v2");
  assert.equal(fallbackResult.fallbackReason, "remote-unavailable");
  assert.deepEqual(fallbackResult.groups.map((group) => group.categoryId), ["health-food"]);
});
