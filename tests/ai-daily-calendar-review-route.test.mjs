import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createRemoteCalendarDiaryReviewProvider } from "../src/modules/insights/calendar-diary-review/client.mjs";
import { postCalendarDiaryReview, reviewCalendarDiaryWithDeepSeek } from "../src/modules/insights/calendar-diary-review/server.mjs";

const URL = "http://localhost:3100/api/organize/day-review";
const input = { schemaVersion: "calendar-diary-review-v1", requestId: "request-1", targetDate: "2026-09-04", sourceFingerprint: "fnv1a-1234abcd", locale: "zh-CN", events: [{ id: "event-001", title: "项目评审", startMinute: 600, endMinute: 660, allDay: false }], entries: [{ id: "entry-001", time: "10:40", content: "完成项目评审" }] };
const output = { schemaVersion: input.schemaVersion, requestId: input.requestId, targetDate: input.targetDate, sourceFingerprint: input.sourceFingerprint, overview: "日程与记录已有对应。", suggestions: [], providerId: "test", generatedAt: 42 };
function request(body, headers = {}) { return new Request(URL, { method: "POST", headers: { authorization: "Bearer valid-token", "content-type": "application/json", origin: "http://localhost:3100", ...headers }, body: JSON.stringify(body) }); }
function modelResponse(value) { return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), { status: 200, headers: { "content-type": "application/json" } }); }

test("authenticated route accepts only strict request fields and rejects persistent metadata", async () => {
  const analyze = async () => output;
  const ok = await postCalendarDiaryReview(request(input), { verifyAccessToken: async () => ({ id: "user-1" }), analyze });
  assert.equal(ok.status, 200);
  for (const [body, status] of [[{ ...input, accountId: "secret" }, 422], [{ ...input, events: [{ ...input.events[0], realId: "secret" }] }, 422], [{ ...input, events: [] }, 422]]) {
    assert.equal((await postCalendarDiaryReview(request(body), { verifyAccessToken: async () => ({ id: "user-1" }), analyze })).status, status);
  }
});

test("route keeps origin, auth, and rate-limit boundaries", async () => {
  const analyze = async () => output;
  assert.equal((await postCalendarDiaryReview(request(input, { origin: "https://example.com" }), { verifyAccessToken: async () => ({ id: "u" }), analyze })).status, 403);
  assert.equal((await postCalendarDiaryReview(new Request(URL, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) }), { verifyAccessToken: async () => ({ id: "u" }), analyze })).status, 401);
  assert.equal((await postCalendarDiaryReview(request(input), { verifyAccessToken: async () => ({ id: "u" }), rateLimit: () => false, analyze })).status, 429);
});

test("calendar-to-AI transfer is denied without the independent server capability flag", async () => {
  let calls = 0;
  const response = await postCalendarDiaryReview(request(input), {
    enabled: false,
    verifyAccessToken: async () => ({ id: "u" }),
    analyze: async () => { calls += 1; return output; }
  });
  assert.equal(response.status, 503);
  assert.equal(calls, 0);
  assert.equal((await response.json()).error.code, "AI_NOT_CONFIGURED");
});

test("production route and UI require separate explicit Calendar-to-AI flags", async () => {
  const routeSource = await readFile(new globalThis.URL("../src/app/api/organize/day-review/route.js", import.meta.url), "utf8");
  const pageSource = await readFile(new globalThis.URL("../src/app/insights/insights-page.js", import.meta.url), "utf8");
  const componentSource = await readFile(new globalThis.URL("../src/app/insights/daily-calendar-review.js", import.meta.url), "utf8");
  assert.match(routeSource, /process\.env\.CALENDAR_AI_TRANSFER_ENABLED === "1"/);
  assert.match(routeSource, /enabled: CALENDAR_AI_TRANSFER_ENABLED/);
  assert.match(pageSource, /process\.env\.NEXT_PUBLIC_CALENDAR_AI_TRANSFER_ENABLED === "1"/);
  assert.match(pageSource, /remoteEnabled=\{CALENDAR_AI_TRANSFER_ENABLED\}/);
  assert.match(componentSource, /remoteEnabled && phase === "idle"/);
});

test("DeepSeek execution is one structured no-tool call and echoes binding", async () => {
  let calls = 0; let body;
  const result = await reviewCalendarDiaryWithDeepSeek(input, { apiKey: "server-secret", now: () => 42, fetchImpl: async (_url, options) => { calls += 1; body = JSON.parse(options.body); return modelResponse({ overview: "日程与记录已有对应。", suggestions: [] }); } });
  assert.equal(calls, 1); assert.equal(body.response_format.type, "json_object"); assert.match(body.messages[0].content, /untrusted source data/); assert.equal(result.sourceFingerprint, input.sourceFingerprint);
});

test("browser provider sends exact fields and rejects stale response echoes", async () => {
  let sent;
  const provider = createRemoteCalendarDiaryReviewProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify(output), { status: 200, headers: { "content-type": "application/json" } }); } });
  assert.equal((await provider.analyze({ ...input, secret: "drop" })).overview, output.overview);
  assert.deepEqual(Object.keys(sent).sort(), ["entries", "events", "locale", "requestId", "schemaVersion", "sourceFingerprint", "targetDate"]);
  const stale = createRemoteCalendarDiaryReviewProvider({ getAccessToken: () => "token", fetchImpl: async () => new Response(JSON.stringify({ ...output, sourceFingerprint: "fnv1a-deadbeef" }), { status: 200 }) });
  await assert.rejects(() => stale.analyze(input), (error) => error.code === "invalid-response");
});
