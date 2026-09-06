import test from "node:test";
import assert from "node:assert/strict";
import { sanitizePlanRecordInput, postPlanRecordReview } from "../src/modules/organize/plan-record-review/server.mjs";

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

test("计划记录 review 服务端输入只保留日期、计划和记录有界字段", () => {
  const sanitized = sanitizePlanRecordInput({ ...input, ignored: "drop", plans: [{ ...input.plans[0], secret: "drop" }] });
  assert.deepEqual(sanitized.plans[0], input.plans[0]);
  assert.throws(() => sanitizePlanRecordInput({ ...input, date: "2026-02-30" }), /date is invalid/);
});

test("计划记录 review 路由继承同源、JSON、账号和限流边界", async () => {
  const analyze = async (value) => ({ schemaVersion: "plan-record-review-v1", date: value.date });
  const verifyAccessToken = async () => ({ id: "user-1" });
  const ok = await postPlanRecordReview(request(input), { analyze, verifyAccessToken, rateLimit: () => true });
  assert.equal(ok.status, 200);
  assert.equal((await ok.json()).schemaVersion, "plan-record-review-v1");
  const noAuth = await postPlanRecordReview(request(input, { authorization: "" }), { analyze, verifyAccessToken });
  assert.equal(noAuth.status, 401);
  const limited = await postPlanRecordReview(request(input), { analyze, verifyAccessToken, rateLimit: () => false });
  assert.equal(limited.status, 429);
});
