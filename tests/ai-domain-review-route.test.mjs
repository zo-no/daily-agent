import test from "node:test";
import assert from "node:assert/strict";
import { MAX_AI_BODY_BYTES } from "../src/shared/ai/http-boundary.mjs";
import { createRemoteDomainReviewProvider, DomainReviewProviderError } from "../src/modules/insights/domain-review/client.mjs";
import {
  postDomainReview,
  reviewDomainWithDeepSeek
} from "../src/modules/insights/domain-review/server.mjs";

const URL = "http://localhost:3100/api/organize/domain-review";
const input = {
  windowStart: "2026-02-24",
  windowEnd: "2026-03-02",
  domainName: "健康",
  locale: "zh-CN",
  entries: [
    { id: "a", date: "2026-03-01", time: "08:10", content: "昨晚睡眠较早", sourceType: "ordinary" },
    { id: "b", date: "2026-03-02", time: "18:30", content: "完成一次散步", sourceType: "periodic" }
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

function modelResponse(output, status = 200) {
  return new Response(JSON.stringify({
    id: "domain-review-test",
    object: "chat.completion",
    created: 1,
    model: "deepseek-chat",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(output) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  }), { status, headers: { "content-type": "application/json" } });
}

test("领域周总结模型使用不可信正文、事实归纳和无建议约束", async () => {
  let captured;
  const result = await reviewDomainWithDeepSeek(input, {
    apiKey: "server-secret",
    model: "deepseek-chat",
    now: () => 99,
    fetchImpl: async (url, options) => {
      captured = { url: String(url), options, body: JSON.parse(options.body) };
      return modelResponse({
        overview: "这一周记录了睡眠和散步。内容只反映已写下的事实。",
        themes: [
          { title: "休息", summary: "记录中提到睡眠。", entryIds: ["a"] },
          { title: "活动", summary: "记录中提到散步。", entryIds: ["b"] }
        ]
      });
    }
  });

  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.equal(new Headers(captured.options.headers).get("authorization"), "Bearer server-secret");
  assert.deepEqual(captured.body.response_format, { type: "json_object" });
  assert.match(captured.body.messages[0].content, /untrusted source data/i);
  assert.match(captured.body.messages[0].content, /diagnos|causal|advice/i);
  assert.equal(result.providerId, "deepseek:deepseek-chat");
  assert.equal(result.generatedAt, 99);
  assert.deepEqual(result.themes.flatMap((theme) => theme.entryIds), ["a", "b"]);
});

test("领域周总结模型请求在服务端时限内中止", async () => {
  await assert.rejects(() => reviewDomainWithDeepSeek(input, {
    apiKey: "server-secret",
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  }), (error) => error.code === "AI_TIMEOUT" && error.status === 504);

  await assert.rejects(() => reviewDomainWithDeepSeek(input, {
    apiKey: "server-secret",
    timeoutMs: 5,
    fetchImpl: async () => new Promise((resolve) => setTimeout(() => resolve(modelResponse({
      overview: "这一周记录了睡眠。",
      themes: []
    })), 15))
  }), (error) => error.code === "AI_TIMEOUT" && error.status === 504);
});

test("领域周总结 API 继承同源、JSON、账号、体积、限流和 no-store 边界", async () => {
  const analyze = async (safe) => ({
    overview: "结果有效。内容保持简短。",
    themes: [],
    providerId: "test",
    generatedAt: safe.entries.length > 0 ? 1 : 0
  });
  const ok = await postDomainReview(request(input, { origin: "http://localhost:3100" }), {
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
    const response = await postDomainReview(candidate, {
      verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
      analyze
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }

  const limited = await postDomainReview(request(input), {
    verifyAccessToken: async () => ({ id: "user-1" }),
    rateLimit: () => false,
    analyze
  });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, "AI_REQUEST_RATE_LIMITED");

  const invalidAnalyzer = await postDomainReview(request(input), {
    verifyAccessToken: async () => ({ id: "user-1" }),
    analyze: async () => ({
      overview: "结果有效。内容保持简短。",
      themes: [],
      providerId: "test",
      generatedAt: 1,
      extra: "forbidden"
    })
  });
  assert.equal(invalidAnalyzer.status, 502);
  assert.equal((await invalidAnalyzer.json()).error.code, "AI_DOMAIN_REVIEW_RESPONSE_INVALID");
});

test("浏览器 provider 只发送严格白名单字段并再次验证响应", async () => {
  let sent;
  const provider = createRemoteDomainReviewProvider({
    getAccessToken: () => "access-token",
    fetchImpl: async (_url, options) => {
      sent = { body: JSON.parse(options.body), headers: new Headers(options.headers), cache: options.cache };
      return new Response(JSON.stringify({
        overview: "这一周记录了睡眠和散步。",
        themes: [{ title: "活动", summary: "记录中提到散步。", entryIds: ["b"] }],
        providerId: "deepseek:test",
        generatedAt: 1
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  const result = await provider.analyze({
    ...input,
    domainId: "forbidden",
    accountId: "forbidden",
    totalCount: 2,
    omittedCount: 0,
    entries: input.entries.map((entry) => ({ ...entry, tags: ["forbidden"], attachments: [] }))
  });
  assert.deepEqual(Object.keys(sent.body).sort(), ["domainName", "entries", "locale", "windowEnd", "windowStart"]);
  assert.ok(sent.body.entries.every((entry) => Object.keys(entry).sort().join(",") === "content,date,id,sourceType,time"));
  assert.equal(sent.headers.get("authorization"), "Bearer access-token");
  assert.equal(sent.cache, "no-store");
  assert.equal(result.providerId, "deepseek:test");
});

test("浏览器 provider 对无配置、HTTP、非法响应、调用者 Abort 和超时均不伪造本地总结", async () => {
  const cases = [
    createRemoteDomainReviewProvider({ getAccessToken: () => "", fetchImpl: async () => new Response() }),
    createRemoteDomainReviewProvider({ getAccessToken: () => "token", fetchImpl: async () => new Response("no", { status: 503 }) }),
    createRemoteDomainReviewProvider({
      getAccessToken: () => "token",
      fetchImpl: async () => new Response(JSON.stringify({
        overview: "伪造结果。只用于测试。",
        themes: [{ title: "伪造", summary: "引用了请求外记录。", entryIds: ["outside"] }],
        providerId: "x",
        generatedAt: 1
      }))
    })
  ];
  for (const provider of cases) {
    await assert.rejects(() => provider.analyze(input), (error) => error instanceof DomainReviewProviderError);
  }

  const caller = new AbortController();
  const aborting = createRemoteDomainReviewProvider({
    getAccessToken: () => "token",
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  });
  const pending = aborting.analyze({ ...input, signal: caller.signal });
  caller.abort();
  await assert.rejects(() => pending, (error) => error.code === "aborted");

  const timingOut = createRemoteDomainReviewProvider({
    getAccessToken: () => "token",
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  });
  await assert.rejects(() => timingOut.analyze(input), (error) => error.code === "timeout");

  const bodyTimingOut = createRemoteDomainReviewProvider({
    getAccessToken: () => "token",
    timeoutMs: 5,
    fetchImpl: async () => ({
      ok: true,
      json: async () => new Promise((resolve) => setTimeout(() => resolve({
        overview: "不应在截止后返回。",
        themes: [],
        providerId: "late",
        generatedAt: 1
      }), 15))
    })
  });
  await assert.rejects(() => bodyTimingOut.analyze(input), (error) => error.code === "timeout");
});
