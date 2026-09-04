import test from "node:test";
import assert from "node:assert/strict";
import { MAX_AI_BODY_BYTES } from "../src/shared/ai/http-boundary.mjs";
import {
  contentImprovementFingerprint
} from "../src/modules/composer/content-improvement/model.mjs";
import {
  improveContentWithDeepSeek,
  postContentImprovement
} from "../src/modules/composer/content-improvement/server.mjs";

const URL = "http://localhost:3100/api/records/improve";
const content = "以后做事先把细节想好，然后再开始。";
const input = {
  schemaVersion: 1,
  requestId: "improve_12345678",
  target: "composer_12345678",
  sourceFingerprint: contentImprovementFingerprint(content),
  locale: "zh-CN",
  content
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
    id: "content-improvement-test",
    object: "chat.completion",
    created: 1,
    model: "deepseek-chat",
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(output) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
  }), { status, headers: { "content-type": "application/json" } });
}

test("内容优化模型一次调用并使用不可信正文、事实保持和无建议约束", async () => {
  let calls = 0;
  let captured;
  const result = await improveContentWithDeepSeek(input, {
    apiKey: "server-secret",
    model: "deepseek-chat",
    fetchImpl: async (url, options) => {
      calls += 1;
      captured = { url: String(url), headers: new Headers(options.headers), body: JSON.parse(options.body) };
      return modelResponse({ improvedContent: "以后做事，先把能想到的细节想清楚，再开始行动。" });
    }
  });
  assert.equal(calls, 1);
  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.equal(captured.headers.get("authorization"), "Bearer server-secret");
  assert.match(captured.body.messages[0].content, /untrusted|不可信/i);
  assert.match(captured.body.messages[0].content, /invent|事实|advice|建议|diagnos/i);
  assert.deepEqual(result, {
    schemaVersion: 1,
    requestId: input.requestId,
    target: input.target,
    sourceFingerprint: input.sourceFingerprint,
    improvedContent: "以后做事，先把能想到的细节想清楚，再开始行动。"
  });
});

test("内容优化 API 继承同源、JSON、账号、体积、限流与 private no-store 边界", async () => {
  const improve = async (safe) => ({
    schemaVersion: safe.schemaVersion,
    requestId: safe.requestId,
    target: safe.target,
    sourceFingerprint: safe.sourceFingerprint,
    improvedContent: "更清晰的测试候选。"
  });
  const ok = await postContentImprovement(request(input, { origin: "http://localhost:3100" }), {
    verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
    improve
  });
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "private, no-store");
  assert.equal(ok.headers.get("x-content-type-options"), "nosniff");
  assert.equal((await ok.json()).improvedContent, "更清晰的测试候选。");

  const cases = [
    [request(input, { origin: "https://example.com" }), 403, "AI_ORIGIN_FORBIDDEN"],
    [request(input, { "content-type": "text/plain" }), 415, "AI_CONTENT_TYPE_REQUIRED"],
    [new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), 401, "AI_AUTH_REQUIRED"],
    [request(input, { authorization: "Bearer invalid" }), 401, "AI_AUTH_INVALID"],
    [request("{}", { "content-length": String(MAX_AI_BODY_BYTES + 1) }), 413, "AI_BODY_TOO_LARGE"]
  ];
  for (const [candidate, status, code] of cases) {
    const response = await postContentImprovement(candidate, {
      verifyAccessToken: async (token) => token === "valid-token" ? { id: "user-1" } : null,
      improve
    });
    assert.equal(response.status, status);
    assert.equal((await response.json()).error.code, code);
  }

  const limited = await postContentImprovement(request(input), {
    verifyAccessToken: async () => ({ id: "user-1" }),
    rateLimit: () => false,
    improve
  });
  assert.equal(limited.status, 429);
  assert.equal((await limited.json()).error.code, "AI_REQUEST_RATE_LIMITED");
});

test("内容优化 API 拒绝超限输入、未知字段和不匹配响应", async () => {
  const cases = [
    { ...input, content: " ", sourceFingerprint: contentImprovementFingerprint(" ") },
    { ...input, content: "x".repeat(4001), sourceFingerprint: contentImprovementFingerprint("x".repeat(4001)) },
    { ...input, entryId: "forbidden" }
  ];
  for (const value of cases) {
    const response = await postContentImprovement(request(value), {
      verifyAccessToken: async () => ({ id: "user-1" }),
      improve: async () => { throw new Error("must not run"); }
    });
    assert.equal(response.status, 400);
  }

  const invalid = await postContentImprovement(request(input), {
    verifyAccessToken: async () => ({ id: "user-1" }),
    improve: async () => ({
      schemaVersion: 1,
      requestId: "improve_stale",
      target: input.target,
      sourceFingerprint: input.sourceFingerprint,
      improvedContent: "不应返回。"
    })
  });
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error.code, "AI_CONTENT_IMPROVEMENT_RESPONSE_INVALID");
});

test("模型超时与非法结构映射为公开安全错误", async () => {
  await assert.rejects(() => improveContentWithDeepSeek(input, {
    apiKey: "server-secret",
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  }), (error) => error.code === "AI_TIMEOUT" && error.status === 504);

  await assert.rejects(() => improveContentWithDeepSeek(input, {
    apiKey: "server-secret",
    fetchImpl: async () => modelResponse({ explanation: "forbidden" })
  }), (error) => error.code === "AI_CONTENT_IMPROVEMENT_RESPONSE_INVALID" && error.status === 502);
});
