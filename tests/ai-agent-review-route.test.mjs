import test from "node:test";
import assert from "node:assert/strict";
import { MAX_AI_BODY_BYTES } from "../src/lib/ai-classifier-route.mjs";
import { createRemoteAgentReviewProvider } from "../src/lib/agent-review-provider.mjs";
import { postAgentReview, sanitizeAgentReviewInput } from "../src/lib/agent-review-route.mjs";

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

test("Agent input keeps only bounded selected-day review fields", () => {
  const safe = sanitizeAgentReviewInput(body);
  assert.deepEqual(Object.keys(safe).sort(), ["categories", "date", "entries", "locale", "mode"]);
  assert.deepEqual(Object.keys(safe.entries[0]).sort(), ["content", "currentCategoryId", "id", "time"]);
  assert.deepEqual(Object.keys(safe.categories[0]).sort(), ["domainName", "id", "name"]);
});

test("Plan Agent input keeps local plan fields and identity-free Google conflict context", () => {
  const safe = sanitizeAgentReviewInput(planBody);
  assert.deepEqual(Object.keys(safe).sort(), ["conflicts", "date", "locale", "mode", "plans", "reviewTarget"]);
  assert.deepEqual(Object.keys(safe.plans[0]).sort(), ["endMinute", "id", "startMinute", "title"]);
  assert.deepEqual(Object.keys(safe.conflicts[0]).sort(), ["endMinute", "startMinute", "title"]);
  assert.equal(JSON.stringify(safe).includes("google-event"), false);
  assert.equal(JSON.stringify(safe).includes("calendarId"), false);
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
