import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePlanRecordInput, postPlanRecordReview, reviewWithDeepSeek } from "../src/modules/organize/plan-record-review/server.mjs";
import { buildPlanRecordReviewFacts, buildPlanRecordRelationInput } from "../src/modules/organize/plan-record-review/model.mjs";
import { createRemotePlanRecordReviewProvider } from "../src/modules/organize/plan-record-review/client.mjs";

function request(body, headers = {}) {
  return new Request("http://localhost/api/organize/plan-record-review", {
    method: "POST",
    headers: { origin: "http://localhost", "content-type": "application/json", authorization: "Bearer token", ...headers },
    body: JSON.stringify(body)
  });
}

const input = {
  date: "2026-09-06",
  locale: "zh-CN",
  plans: [{ id: "p1", title: "写作", startTime: "09:00", endTime: "10:00", goalId: null }],
  entries: [{ id: "e1", content: "完成一段文字" }]
};

const localInput = {
  ...input,
  plans: input.plans.map((plan) => ({ ...plan, date: input.date, source: "local" })),
  entries: [{ id: "e1", date: input.date, time: "09:30:15", content: "完成一段文字" }]
};

const transportInput = buildPlanRecordRelationInput(buildPlanRecordReviewFacts(localInput), { locale: "zh-CN", requestId: "test-request" });
function relationResponse(body, relations = [{ entryId: "entry-001", relation: "related" }]) {
  return { schemaVersion: body.schemaVersion, requestId: body.requestId, date: body.date, sourceFingerprint: body.sourceFingerprint, relations };
}

test("second-precision records retain inclusive start and exclusive end evidence", () => {
  const facts = buildPlanRecordReviewFacts({ ...localInput, entries: ["08:59:59", "09:00:00", "09:59:59", "10:00:00"].map((time, index) => ({ ...localInput.entries[0], id: `e${index}`, time })) });
  assert.deepEqual(facts.entries.map((entry) => entry.evidence), ["outside", "inside", "inside", "outside"]);
  assert.equal(facts.metrics.planCoverageRatio, 1);
  assert.equal(facts.metrics.inPlanRecordRatio, 0.5);
});

test("successful remote relation analysis preserves local plans, records, and metrics", async () => {
  const provider = createRemotePlanRecordReviewProvider({
    getAccessToken: () => "token",
    fetchImpl: async (_url, options) => postPlanRecordReview(request(JSON.parse(options.body)), {
      verifyAccessToken: async () => ({ id: "user-1" }),
      analyze: (value) => reviewWithDeepSeek(value, {
        apiKey: "synthetic-key",
        fetchImpl: async () => new Response(JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ relations: [{ entryId: "entry-001", relation: "related" }] }) } }]
        }), { status: 200, headers: { "content-type": "application/json" } })
      })
    })
  });
  const source = { ...localInput, entries: [{ ...localInput.entries[0], time: "09:30" }] };
  const result = await provider.analyze(source);
  assert.equal(result.plans.length, 1);
  assert.equal(result.entries.length, 1);
  assert.equal(result.metrics.planCoverageRatio, 1);
  assert.equal(result.metrics.inPlanRecordRatio, 1);
  assert.equal(result.entries[0].time, "09:30");
  assert.equal(result.entries[0].id, "e1");
  assert.equal(result.entries[0].relation, "related");
  assert.equal(result.fallbackReason, undefined);
});

test("only in-window records leave the browser and opaque IDs still map to their original rows", async () => {
  const source = { ...localInput, entries: [
    { ...localInput.entries[0], id: "outside", time: "08:00:00", content: "outside text remains private" },
    localInput.entries[0]
  ] };
  let sent;
  const provider = createRemotePlanRecordReviewProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify(relationResponse(sent, [{ entryId: "entry-002", relation: "related" }])), { status: 200 });
  } });
  const result = await provider.analyze(source);
  assert.deepEqual(sent.entries.map((entry) => entry.id), ["entry-002"]);
  assert.doesNotMatch(JSON.stringify(sent), /outside text/);
  assert.deepEqual(result.entries.map((entry) => entry.relation), ["uncertain", "related"]);
  assert.equal(result.entries[0].content, source.entries[0].content);
  assert.equal(result.metrics.inPlanRecordRatio, 0.5);
});

test("model output with echoed metadata, fabricated sources, or duplicate relations is rejected", async () => {
  for (const output of [
    { ...relationResponse(transportInput), locale: "zh-CN", relations: [{ entryId: "entry-001", planIds: ["plan-001"], relation: "related" }] },
    { relations: [{ entryId: "entry-999", relation: "related" }] },
    { relations: Array(2).fill({ entryId: "entry-001", relation: "related" }) }
  ]) {
    await assert.rejects(reviewWithDeepSeek(transportInput, {
      apiKey: "synthetic-key",
      fetchImpl: async () => new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify(output) } }]
      }), { status: 200, headers: { "content-type": "application/json" } })
    }), (error) => error.code === "AI_RESPONSE_INVALID");
  }
});

test("plan review rejects unknown fields, invalid dates, source IDs, bounds, and fingerprints", () => {
  assert.deepEqual(sanitizePlanRecordInput(transportInput), transportInput);
  for (const invalid of [
    { ...transportInput, ignored: "reject" },
    { ...transportInput, date: "2026-02-30" },
    { ...transportInput, sourceFingerprint: "fnv1a-00000000" },
    { ...transportInput, plans: [{ ...transportInput.plans[0], goalId: "private" }] },
    { ...transportInput, plans: [{ ...transportInput.plans[0], startTime: "25:00" }] },
    { ...transportInput, entries: [{ ...transportInput.entries[0], attachments: [] }] },
    { ...transportInput, entries: [{ ...transportInput.entries[0], content: "x".repeat(361) }] },
    { ...transportInput, entries: [{ ...transportInput.entries[0], planIds: ["plan-999"] }] },
    { ...transportInput, entries: [transportInput.entries[0], transportInput.entries[0]] },
    { ...transportInput, entries: Array(201).fill(transportInput.entries[0]) }
  ]) assert.throws(() => sanitizePlanRecordInput(invalid), /input is invalid/);
});

test("计划记录 review 路由继承同源、JSON、账号和限流边界", async () => {
  const analyze = async (value) => ({ schemaVersion: "plan-record-review-v1", date: value.date });
  const verifyAccessToken = async () => ({ id: "user-1" });
  const ok = await postPlanRecordReview(request(transportInput), { analyze, verifyAccessToken, rateLimit: () => true });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).schemaVersion, "plan-record-review-v1");
  const noAuth = await postPlanRecordReview(request(input, { authorization: "" }), { analyze, verifyAccessToken });
  assert.equal(noAuth.status, 401);
  const limited = await postPlanRecordReview(request(input), { analyze, verifyAccessToken, rateLimit: () => false });
  assert.equal(limited.status, 429);
  const invalid = await postPlanRecordReview(request({ ...transportInput, account: "private" }), {
    analyze: () => assert.fail("Invalid input must not call AI"), verifyAccessToken
  });
  assert.equal(invalid.status, 422);
  assert.match(ok.headers.get("cache-control"), /no-store/);
});

test("remote projection is bounded and opaque while local evidence preserves full source text", async () => {
  const source = {
    ...localInput,
    plans: Array.from({ length: 101 }, (_, index) => ({ ...localInput.plans[0], id: `private-plan-${index}`, goalId: "private-goal" })),
    entries: Array.from({ length: 201 }, (_, index) => ({ ...localInput.entries[0], id: `private-entry-${index}`, content: "字".repeat(500), tags: ["private"], attachments: [{ id: "image" }] }))
  };
  const before = structuredClone(source);
  let sent;
  const provider = createRemotePlanRecordReviewProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => {
    sent = JSON.parse(options.body);
    return new Response(JSON.stringify(relationResponse(sent)), { status: 200 });
  } });
  const result = await provider.analyze(source);
  assert.equal(sent.plans.length, 100);
  assert.equal(sent.entries.length, 200);
  assert.equal(sent.entries[0].content.length, 360);
  assert.equal(sent.entries[0].time, "09:30:15");
  assert.deepEqual(sanitizePlanRecordInput(sent), sent);
  assert.doesNotMatch(JSON.stringify(sent), /private-|goalId|tags|attachments/);
  assert.equal(result.metrics.planCount, 101);
  assert.equal(result.metrics.recordCount, 201);
  assert.equal(result.entries[0].content.length, 500);
  assert.equal(result.entries[200].relation, "uncertain");
  assert.deepEqual(source, before);
});

test("stale, fabricated, duplicate, or invalid remote results cannot replace local evidence", async () => {
  for (const alter of [
    (value) => ({ ...value, requestId: "old" }),
    (value) => ({ ...value, date: "2026-09-07" }),
    (value) => ({ ...value, sourceFingerprint: "fnv1a-00000000" }),
    (value) => ({ ...value, metrics: { planCount: 999 } }),
    (value) => ({ ...value, relations: [{ entryId: "entry-999", relation: "related" }] }),
    (value) => ({ ...value, relations: [{ entryId: "entry-001", relation: "made-up" }] }),
    (value) => ({ ...value, relations: [...value.relations, ...value.relations] }),
    () => ({ schemaVersion: "plan-record-review-v1", plans: [], entries: [] })
  ]) {
    let calls = 0;
    const provider = createRemotePlanRecordReviewProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => {
      calls += 1;
      return new Response(JSON.stringify(alter(relationResponse(JSON.parse(options.body)))), { status: 200 });
    } });
    const result = await provider.analyze(localInput);
    assert.equal(result.fallbackReason, "invalid-response");
    assert.equal(result.metrics.planCoverageRatio, 1);
    assert.equal(result.entries[0].relation, "uncertain");
    assert.equal(calls, 1);
  }
});

test("cancellation reaches the network and a late reply remains local-only", async () => {
  const controller = new AbortController();
  let calls = 0;
  const provider = createRemotePlanRecordReviewProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => {
    calls += 1;
    controller.abort();
    assert.equal(options.signal.aborted, true);
    return new Response(JSON.stringify(relationResponse(JSON.parse(options.body))), { status: 200 });
  } });
  const result = await provider.analyze({ ...localInput, signal: controller.signal });
  assert.equal(result.fallbackReason, "aborted");
  assert.equal(result.entries[0].relation, "uncertain");
  assert.equal(result.metrics.planCoverageRatio, 1);
  assert.equal(calls, 1);
});
