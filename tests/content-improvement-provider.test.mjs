import test from "node:test";
import assert from "node:assert/strict";
import {
  contentImprovementFingerprint
} from "../src/lib/content-improvement-model.mjs";
import {
  ContentImprovementProviderError,
  createRemoteContentImprovementProvider
} from "../src/lib/content-improvement-provider.mjs";

const content = "这是一段需要更清晰表达的记录。";
const input = {
  schemaVersion: 1,
  requestId: "improve_12345678",
  target: "composer_12345678",
  sourceFingerprint: contentImprovementFingerprint(content),
  locale: "zh-CN",
  content,
  entryId: "forbidden",
  categoryId: "forbidden",
  tags: ["forbidden"],
  attachments: [{ id: "forbidden" }]
};

function response(overrides = {}) {
  return new Response(JSON.stringify({
    schemaVersion: 1,
    requestId: input.requestId,
    target: input.target,
    sourceFingerprint: input.sourceFingerprint,
    improvedContent: "这段记录表达得更清晰。",
    ...overrides
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("浏览器 provider 只发送六字段、Bearer header、no-store 且每次只 fetch 一次", async () => {
  let calls = 0;
  let sent;
  const provider = createRemoteContentImprovementProvider({
    getAccessToken: async () => "access-token",
    fetchImpl: async (_url, options) => {
      calls += 1;
      sent = { body: JSON.parse(options.body), headers: new Headers(options.headers), cache: options.cache };
      return response();
    }
  });
  const result = await provider.improve(input);
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(sent.body).sort(), ["content", "locale", "requestId", "schemaVersion", "sourceFingerprint", "target"]);
  assert.equal(sent.headers.get("authorization"), "Bearer access-token");
  assert.equal(sent.cache, "no-store");
  assert.equal(result.improvedContent, "这段记录表达得更清晰。");
});

test("空白、超限、无 token 与非法响应都在零安全结果下失败", async () => {
  let calls = 0;
  const fetchImpl = async () => { calls += 1; return response(); };
  const configured = createRemoteContentImprovementProvider({ getAccessToken: () => "token", fetchImpl });
  const blank = "   ";
  await assert.rejects(() => configured.improve({
    ...input,
    content: blank,
    sourceFingerprint: contentImprovementFingerprint(blank)
  }), (error) => error instanceof ContentImprovementProviderError && error.code === "invalid-input");
  assert.equal(calls, 0);

  const unconfigured = createRemoteContentImprovementProvider({ getAccessToken: () => "", fetchImpl });
  await assert.rejects(() => unconfigured.improve(input), (error) => error.code === "unconfigured");
  assert.equal(calls, 0);

  const invalid = createRemoteContentImprovementProvider({
    getAccessToken: () => "token",
    fetchImpl: async () => response({ requestId: "improve_stale" })
  });
  await assert.rejects(() => invalid.improve(input), (error) => error.code === "invalid-response");
});

test("调用者中止、超时与 HTTP 状态映射为可公开错误且不泄露正文或 token", async () => {
  const controller = new AbortController();
  const aborting = createRemoteContentImprovementProvider({
    getAccessToken: () => "private-token",
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  });
  const pending = aborting.improve({ ...input, signal: controller.signal });
  controller.abort();
  await assert.rejects(() => pending, (error) => error.code === "aborted");

  const timingOut = createRemoteContentImprovementProvider({
    getAccessToken: () => "private-token",
    timeoutMs: 5,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    })
  });
  await assert.rejects(() => timingOut.improve(input), (error) => error.code === "timeout");

  for (const [status, code] of [[401, "auth"], [403, "auth"], [429, "rate-limited"], [503, "unconfigured"], [504, "timeout"], [502, "invalid-response"]]) {
    const provider = createRemoteContentImprovementProvider({
      getAccessToken: () => "private-token",
      fetchImpl: async () => new Response("no", { status })
    });
    await assert.rejects(() => provider.improve(input), (error) => {
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private-token|需要更清晰/);
      return true;
    });
  }
});
