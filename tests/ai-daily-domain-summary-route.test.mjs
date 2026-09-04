import assert from "node:assert/strict";
import test from "node:test";
import { AiClassifierError, MAX_AI_BODY_BYTES } from "../src/lib/ai-route-boundary.mjs";
import { createRemoteDomainDailySummaryProvider, DomainDailySummaryProviderError } from "../src/lib/domain-daily-summary-provider.mjs";
import { postDomainDailySummary, summarizeDomainTodayWithDeepSeek } from "../src/lib/domain-daily-summary-route.mjs";

const URL = "http://localhost:3100/api/organize/domain-daily-summary";
const input = { domainName: "健康", date: "2026-09-03", locale: "zh-CN", entries: [{ id: "a", date: "2026-09-03", time: "09:00", content: "完成散步", sourceType: "ordinary" }] };
function request(body, headers = {}) { return new Request(URL, { method: "POST", headers: { authorization: "Bearer valid-token", "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }); }
function modelResponse(output) { return new Response(JSON.stringify({ id: "daily", model: "deepseek-chat", choices: [{ message: { content: JSON.stringify(output) } }] }), { status: 200, headers: { "content-type": "application/json" } }); }
const output = { overview: "今天记录了散步。", overviewEntryIds: ["a"], themes: [] };

test("daily Mastra route makes one bounded factual generation with exact capability", async () => {
  let calls = 0; let captured;
  const result = await summarizeDomainTodayWithDeepSeek(input, { apiKey: "secret", now: () => 99, fetchImpl: async (url, options) => { calls += 1; captured = { url, body: JSON.parse(options.body) }; return modelResponse(output); } });
  assert.equal(calls, 1);
  assert.equal(captured.url, "https://api.deepseek.com/chat/completions");
  assert.deepEqual(captured.body.response_format, { type: "json_object" });
  assert.match(captured.body.messages[0].content, /untrusted source data/i);
  assert.match(captured.body.messages[0].content, /diagnos|causal|advice/i);
  assert.equal(result.providerId, "deepseek:deepseek-chat");
  assert.equal(result.generatedAt, 99);
});

test("daily route enforces same-origin, auth, JSON, body, rate limit, no-store and strict response", async () => {
  const analyze = async (value) => ({ ...output, providerId: "test", generatedAt: value.entries.length });
  const ok = await postDomainDailySummary(request(input, { origin: URL.replace("/api/organize/domain-daily-summary", "") }), { verifyAccessToken: async () => ({ id: "u1" }), analyze });
  assert.equal(ok.status, 200); assert.equal(ok.headers.get("cache-control"), "private, no-store"); assert.equal((await ok.json()).providerId, "test");
  for (const [candidate, status, code] of [
    [request(input, { origin: "https://example.com" }), 403, "AI_ORIGIN_FORBIDDEN"],
    [request(input, { "content-type": "text/plain" }), 415, "AI_CONTENT_TYPE_REQUIRED"],
    [new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), 401, "AI_AUTH_REQUIRED"],
    [request("{}", { "content-length": String(MAX_AI_BODY_BYTES + 1) }), 413, "AI_BODY_TOO_LARGE"],
    [request("{"), 400, "AI_JSON_INVALID"],
    [request({ ...input, accountId: "forbidden" }), 422, "AI_DOMAIN_DAILY_SUMMARY_INPUT_INVALID"]
  ]) {
    const response = await postDomainDailySummary(candidate, { verifyAccessToken: async () => ({ id: "u1" }), analyze });
    assert.equal(response.status, status); assert.equal((await response.json()).error.code, code);
  }
  const limited = await postDomainDailySummary(request(input), { verifyAccessToken: async () => ({ id: "u1" }), rateLimit: () => false, analyze });
  assert.equal(limited.status, 429);
  const invalidAuth = await postDomainDailySummary(request(input), { verifyAccessToken: async () => null, analyze });
  assert.equal(invalidAuth.status, 401); assert.equal((await invalidAuth.json()).error.code, "AI_AUTH_INVALID");
  const invalid = await postDomainDailySummary(request(input), { verifyAccessToken: async () => ({ id: "u1" }), analyze: async () => ({ ...output, providerId: "test", generatedAt: 1, extra: true }) });
  assert.equal(invalid.status, 502);
  assert.equal((await invalid.json()).error.code, "AI_DOMAIN_DAILY_SUMMARY_RESPONSE_INVALID");
  const unsafe = await postDomainDailySummary(request(input), { verifyAccessToken: async () => ({ id: "u1" }), analyze: async () => { throw new AiClassifierError("AI_DOMAIN_DAILY_SUMMARY_UNSAFE", "unsafe", 502); } });
  assert.equal(unsafe.status, 502); assert.equal((await unsafe.json()).error.code, "AI_DOMAIN_DAILY_SUMMARY_UNSAFE");
});

test("daily Mastra route maps missing configuration, timeout, rate limit, and invalid output without retry", async () => {
  await assert.rejects(() => summarizeDomainTodayWithDeepSeek(input, { apiKey: "" }), (error) => error.code === "AI_NOT_CONFIGURED" && error.status === 503);
  let timeoutCalls = 0;
  await assert.rejects(() => summarizeDomainTodayWithDeepSeek(input, { apiKey: "secret", timeoutMs: 5, fetchImpl: async () => { timeoutCalls += 1; return new Promise(() => {}); } }), (error) => error.code === "AI_TIMEOUT" && error.status === 504);
  assert.equal(timeoutCalls, 1);
  let limitedCalls = 0;
  await assert.rejects(() => summarizeDomainTodayWithDeepSeek(input, { apiKey: "secret", fetchImpl: async () => { limitedCalls += 1; return new Response(JSON.stringify({ error: "limited" }), { status: 429, headers: { "content-type": "application/json" } }); } }), (error) => error.code === "AI_RATE_LIMITED" && error.status === 429);
  assert.equal(limitedCalls, 1);
  await assert.rejects(() => summarizeDomainTodayWithDeepSeek(input, { apiKey: "secret", fetchImpl: async () => modelResponse({ overview: "Unsupported.", overviewEntryIds: ["outside"], themes: [] }) }), (error) => error.code === "AI_DOMAIN_DAILY_SUMMARY_RESPONSE_INVALID" && error.status === 502);
  await assert.rejects(() => summarizeDomainTodayWithDeepSeek(input, { apiKey: "secret", fetchImpl: async () => modelResponse({ overview: "You should create a task.", overviewEntryIds: ["a"], themes: [] }) }), (error) => error.code === "AI_DOMAIN_DAILY_SUMMARY_UNSAFE" && error.status === 502);
});

test("daily browser provider sends only exact fields, validates response, and maps abort/timeout", async () => {
  let sent; let calls = 0;
  const provider = createRemoteDomainDailySummaryProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => { calls += 1; sent = { body: JSON.parse(options.body), headers: new Headers(options.headers), cache: options.cache }; return new Response(JSON.stringify({ ...output, providerId: "test", generatedAt: 1 }), { status: 200 }); } });
  const result = await provider.analyze({ ...input, accountId: "hidden", domainId: "hidden", signal: undefined });
  assert.equal(calls, 1); assert.deepEqual(Object.keys(sent.body).sort(), ["date", "domainName", "entries", "locale"]); assert.equal(sent.headers.get("authorization"), "Bearer token"); assert.equal(sent.cache, "no-store"); assert.equal(result.providerId, "test");
  const controller = new AbortController();
  const pending = createRemoteDomainDailySummaryProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true })) }).analyze({ ...input, signal: controller.signal });
  controller.abort(); await assert.rejects(() => pending, (error) => error.code === "aborted");
  const timeout = createRemoteDomainDailySummaryProvider({ getAccessToken: () => "token", timeoutMs: 5, fetchImpl: async () => new Promise((resolve) => setTimeout(() => resolve(new Response(JSON.stringify({ ...output, providerId: "late", generatedAt: 1 }))), 15)) });
  await assert.rejects(() => timeout.analyze(input), (error) => error instanceof DomainDailySummaryProviderError && error.code === "timeout");
  for (const [status, serverCode, expected] of [
    [401, "AI_AUTH_REQUIRED", "auth"],
    [429, "AI_REQUEST_RATE_LIMITED", "rate-limited"],
    [503, "AI_NOT_CONFIGURED", "unconfigured"],
    [504, "AI_TIMEOUT", "timeout"],
    [502, "AI_DOMAIN_DAILY_SUMMARY_UNSAFE", "unsafe"]
  ]) {
    const failing = createRemoteDomainDailySummaryProvider({ getAccessToken: () => "token", fetchImpl: async () => new Response(JSON.stringify({ error: { code: serverCode } }), { status }) });
    await assert.rejects(() => failing.analyze(input), (error) => error instanceof DomainDailySummaryProviderError && error.code === expected);
  }
});
