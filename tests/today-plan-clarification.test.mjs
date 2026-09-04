import assert from "node:assert/strict";
import test from "node:test";
import { buildTodayPlanClarificationInput, normalizeTodayPlanClarificationAnalysis, normalizeTodayPlanClarificationReply, sanitizeTodayPlanClarificationInput, validateTodayPlanClarificationResponse } from "../src/modules/diary/today-plan-clarification/model.mjs";
import { createRemoteTodayPlanClarificationProvider } from "../src/modules/diary/today-plan-clarification/client.mjs";
import { clarifyTodayPlanWithDeepSeek, postTodayPlanClarification } from "../src/modules/diary/today-plan-clarification/server.mjs";

const base = buildTodayPlanClarificationInput({ plans: [{ source: "local", date: "2026-09-04", title: "完成需求评审", startMinute: 600, endMinute: 660 }], entries: [{ date: "2026-09-04", time: "10:20", content: "需求评审结束", createdAt: 1 }] }, { date: "2026-09-04", locale: "zh-CN" });
const analyze = { ...base, mode: "analyze", requestId: "request-1" };
const analysisOutput = { schemaVersion: analyze.schemaVersion, mode: "analyze", requestId: analyze.requestId, targetDate: analyze.targetDate, sourceFingerprint: analyze.sourceFingerprint, targets: [{ kind: "entry", sourceId: "entry-001", question: "评审结论是什么？", summary: "缺少结论" }], providerId: "test", generatedAt: 1 };
const reply = { schemaVersion: base.schemaVersion, mode: "reply", requestId: "request-2", targetDate: base.targetDate, sourceFingerprint: base.sourceFingerprint, locale: "zh-CN", target: { kind: "entry", sourceId: "entry-001", time: "10:20", content: "需求评审结束" }, questionIndex: 1, answers: [{ question: "评审结论是什么？", answer: "结论是本周完成方案。" }] };

function request(body, headers = {}) { return new Request("http://localhost:3100/api/organize/today-plan-clarification", { method: "POST", headers: { authorization: "Bearer token", "content-type": "application/json", origin: "http://localhost:3100", ...headers }, body: JSON.stringify(body) }); }

test("today clarification projects only local plans and opaque source IDs", () => {
  assert.deepEqual(base.plans, [{ id: "plan-001", title: "完成需求评审", startMinute: 600, endMinute: 660 }]);
  assert.deepEqual(base.entries, [{ id: "entry-001", time: "10:20", content: "需求评审结束" }]);
  assert.throws(() => sanitizeTodayPlanClarificationInput({ ...analyze, accountId: "forbidden" }), /unsupported|invalid/i);
  assert.throws(() => sanitizeTodayPlanClarificationInput({ ...analyze, plans: [{ ...analyze.plans[0], id: "plan-real-id" }] }), /invalid|fingerprint/i);
});

test("analysis and replies are bound, allowlisted, and stop after two questions", () => {
  assert.deepEqual(normalizeTodayPlanClarificationAnalysis({ targets: analysisOutput.targets }, analyze).targets, analysisOutput.targets);
  assert.throws(() => normalizeTodayPlanClarificationAnalysis({ targets: [{ ...analysisOutput.targets[0], sourceId: "entry-999" }] }, analyze), /invalid/i);
  const secondQuestion = normalizeTodayPlanClarificationReply({ outcome: "question", question: "下一步是什么？", replacementContent: "" }, reply);
  assert.equal(secondQuestion.questionIndex, 1);
  assert.deepEqual(sanitizeTodayPlanClarificationInput(reply).target, reply.target);
  assert.throws(() => sanitizeTodayPlanClarificationInput({ ...reply, answers: [] }), /history|invalid/i);
  assert.throws(() => sanitizeTodayPlanClarificationInput({ ...reply, target: { kind: "entry", sourceId: "entry-001" } }), /unsupported|invalid/i);
  assert.throws(() => normalizeTodayPlanClarificationReply({ outcome: "question", question: "还要补充吗？", replacementContent: "" }, { ...reply, questionIndex: 2 }), /invalid/i);
  const candidate = normalizeTodayPlanClarificationReply({ outcome: "candidate", question: "", replacementContent: "完成需求评审，结论是本周完成方案。" }, { ...reply, questionIndex: 2, answers: [...reply.answers, { question: "下一步是什么？", answer: "本周完成方案。" }] });
  assert.equal(candidate.replacementContent, "完成需求评审，结论是本周完成方案。");
  assert.deepEqual(validateTodayPlanClarificationResponse(analysisOutput, analyze).targets, analysisOutput.targets);
});

test("route and browser provider enforce auth, exact payload, and stale response rejection", async () => {
  const ok = await postTodayPlanClarification(request(analyze), { verifyAccessToken: async () => ({ id: "u" }), clarify: async () => analysisOutput });
  assert.equal(ok.status, 200);
  assert.equal((await postTodayPlanClarification(request(analyze, { origin: "https://example.com" }), { verifyAccessToken: async () => ({ id: "u" }), clarify: async () => analysisOutput })).status, 403);
  let sent;
  const provider = createRemoteTodayPlanClarificationProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify(analysisOutput), { status: 200, headers: { "content-type": "application/json" } }); } });
  assert.equal((await provider.analyze({ ...analyze, accountId: "drop" })).targets.length, 1);
  assert.deepEqual(Object.keys(sent).sort(), ["entries", "locale", "mode", "plans", "requestId", "schemaVersion", "sourceFingerprint", "targetDate"]);
  const replyOutput = { schemaVersion: reply.schemaVersion, mode: "reply", requestId: reply.requestId, targetDate: reply.targetDate, sourceFingerprint: reply.sourceFingerprint, target: { kind: "entry", sourceId: "entry-001" }, questionIndex: 1, outcome: "candidate", question: "", replacementContent: "需求评审结束，结论是本周完成方案。", providerId: "test", generatedAt: 2 };
  const replyProvider = createRemoteTodayPlanClarificationProvider({ getAccessToken: () => "token", fetchImpl: async (_url, options) => { sent = JSON.parse(options.body); return new Response(JSON.stringify(replyOutput), { status: 200, headers: { "content-type": "application/json" } }); } });
  assert.equal((await replyProvider.reply({ ...reply, privateNote: "drop" })).replacementContent, replyOutput.replacementContent);
  assert.deepEqual(Object.keys(sent).sort(), ["answers", "locale", "mode", "questionIndex", "requestId", "schemaVersion", "sourceFingerprint", "target", "targetDate"]);
  assert.equal(sent.target.content, "需求评审结束");
  assert.deepEqual(sent.answers, reply.answers);
  const stale = createRemoteTodayPlanClarificationProvider({ getAccessToken: () => "token", fetchImpl: async () => new Response(JSON.stringify({ ...analysisOutput, requestId: "stale" }), { status: 200 }) });
  await assert.rejects(() => stale.analyze(analyze), (error) => error.code === "invalid-response");
});

test("DeepSeek boundary uses one structured tool-free call and echoes opaque bindings", async () => {
  let calls = 0; let payload;
  const result = await clarifyTodayPlanWithDeepSeek(analyze, {
    apiKey: "test-key",
    now: () => 9,
    fetchImpl: async (_url, options) => {
      calls += 1; payload = JSON.parse(options.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ targets: analysisOutput.targets }) } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(calls, 1);
  assert.equal(payload.response_format.type, "json_object");
  assert.match(payload.messages[0].content, /untrusted data/);
  assert.deepEqual(result.targets, analysisOutput.targets);

  const replyResult = await clarifyTodayPlanWithDeepSeek(reply, {
    apiKey: "test-key",
    now: () => 10,
    fetchImpl: async (_url, options) => {
      calls += 1; payload = JSON.parse(options.body);
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ outcome: "candidate", question: "", replacementContent: "需求评审结束，结论是本周完成方案。" }) } }] }), { status: 200, headers: { "content-type": "application/json" } });
    }
  });
  assert.equal(calls, 2, "Each analyze or reply request should make exactly one provider call with no retry");
  assert.match(JSON.stringify(payload.messages), /需求评审结束/);
  assert.match(JSON.stringify(payload.messages), /评审结论是什么/);
  assert.equal(replyResult.replacementContent, "需求评审结束，结论是本周完成方案。");
});
