import test from "node:test";
import assert from "node:assert/strict";
import { MAX_AI_BODY_BYTES } from "../src/shared/ai/http-boundary.mjs";
import { createRemoteDailyReviewProvider } from "../src/modules/organize/daily-review/client.mjs";
import {
  postDailyReview,
  reviewWithDeepSeek,
  sanitizeDailyReviewInput
} from "../src/modules/organize/daily-review/server.mjs";

const URL = "http://localhost:3100/api/organize/review";
const input = {
  date: "2026-08-18",
  locale: "zh-CN",
  entries: [
    { id: "b", time: "18:30", content: "完成晚间复盘", tags: ["不发送"] },
    { id: "a", time: "08:10", content: "上午整理需求", categoryId: "private" },
    { id: "c", time: "25:00", content: "未记录有效时间", email: "private@example.com" }
  ]
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

function modelResponse(content, status = 200) {
  return new Response(JSON.stringify({
    id: "review-test",
    object: "chat.completion",
    created: 1,
    model: "deepseek-chat",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  }), { status, headers: { "content-type": "application/json" } });
}

test("每日梳理服务端只保留日期、语言和有界 id/time/content，并按时间正序", () => {
  const safe = sanitizeDailyReviewInput({
    ...input,
    entries: [...input.entries, input.entries[0], { id: "", content: "坏记录" }],
    account: "must-not-leave-route"
  });
  assert.deepEqual(Object.keys(safe).sort(), ["date", "entries", "locale"]);
  assert.deepEqual(safe.entries.map((entry) => entry.id), ["a", "b", "c"]);
  assert.deepEqual(Object.keys(safe.entries[0]).sort(), ["content", "id", "time"]);
  assert.equal(safe.entries[2].time, "");
  assert.throws(() => sanitizeDailyReviewInput({ ...input, date: "2026-02-30" }), (error) => error.code === "AI_REVIEW_DATE_INVALID");
});

test("Mastra 通过 DeepSeek JSON object 生成结构化时间梳理并保持来源引用", async () => {
  const safe = sanitizeDailyReviewInput(input);
  let captured;
  const result = await reviewWithDeepSeek(safe, {
    apiKey: "server-secret",
    model: "deepseek-chat",
    now: () => 30,
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options, body: JSON.parse(options.body) };
      return modelResponse(JSON.stringify({
        overview: "这一天从需求整理推进到晚间复盘。",
        segments: [
          { title: "上午整理", summary: "上午梳理了需求。", entryIds: ["a"] },
          { title: "晚间复盘", summary: "晚上完成复盘。", entryIds: ["b"] }
        ]
      }));
    }
  });

  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.equal(new Headers(captured.options.headers).get("authorization"), "Bearer server-secret");
  assert.deepEqual(captured.body.response_format, { type: "json_object" });
  assert.match(captured.body.messages[0].content, /untrusted source data/);
  assert.match(captured.body.messages[0].content, /Simplified Chinese/);
  assert.equal(result.providerId, "deepseek:deepseek-chat");
  assert.deepEqual(result.segments.flatMap((segment) => segment.entryIds), ["a", "b", "c"]);
  assert.equal(result.segments.at(-1).sourceOnly, true);
  assert.equal(result.generatedAt, 30);

  await assert.rejects(() => reviewWithDeepSeek(safe, {
    apiKey: "server-secret",
    fetchImpl: async () => modelResponse("not-json")
  }), (error) => error.code === "AI_RESPONSE_INVALID" && error.status === 502);
});

test("每日梳理 API 继承同源、JSON、账号、体积和限流边界", async () => {
  const analyze = async (safe) => ({ providerId: "test", overview: "", segments: [], analyzedEntryIds: safe.entries.map((entry) => entry.id), generatedAt: 1 });
  const ok = await postDailyReview(request(input, { origin: "http://localhost:3100" }), {
    verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
    analyze
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal((await ok.json()).providerId, "test");

  const cases = [
    [request(input, { origin: "https://example.com" }), 403, "AI_ORIGIN_FORBIDDEN"],
    [request(input, { "content-type": "text/plain" }), 415, "AI_CONTENT_TYPE_REQUIRED"],
    [new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), 401, "AI_AUTH_REQUIRED"],
    [request(input, { authorization: "Bearer invalid" }), 401, "AI_AUTH_INVALID"],
    [request("{}", { "content-length": String(MAX_AI_BODY_BYTES + 1) }), 413, "AI_BODY_TOO_LARGE"]
  ];
  for (const [candidate, status, code] of cases) {
    const response = await postDailyReview(candidate, {
      verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
      analyze
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }
});

test("浏览器 provider 只发送所选日时间字段，远端失败退化为本地时间线", async () => {
  let sent;
  const remote = createRemoteDailyReviewProvider({
    getAccessToken: () => "access-token",
    fetchImpl: async (_url, options) => {
      sent = JSON.parse(options.body);
      return new Response(JSON.stringify({
        providerId: "deepseek:test",
        overview: "一天的梳理",
        segments: [],
        analyzedEntryIds: ["a", "b", "c"],
        generatedAt: 1
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  await remote.analyze({ date: input.date, locale: input.locale, entries: input.entries });
  assert.deepEqual(Object.keys(sent).sort(), ["date", "entries", "locale"]);
  assert.deepEqual(sent.entries.map((entry) => entry.id), ["a", "b", "c"]);
  assert.ok(sent.entries.every((entry) => Object.keys(entry).sort().join(",") === "content,id,time"));

  const fallback = createRemoteDailyReviewProvider({
    getAccessToken: () => "access-token",
    fetchImpl: async () => new Response("unavailable", { status: 503 })
  });
  const fallbackResult = await fallback.analyze({ date: input.date, locale: input.locale, entries: input.entries });
  assert.equal(fallbackResult.providerId, "local-timeline-v1");
  assert.equal(fallbackResult.fallbackReason, "remote-unavailable");
  assert.deepEqual(fallbackResult.segments.flatMap((segment) => segment.entryIds), ["a", "b", "c"]);
});
