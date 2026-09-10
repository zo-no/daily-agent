import test from "node:test";
import assert from "node:assert/strict";
import {
  CHAT_SCHEMA_VERSION,
  MAX_CHAT_REPLY_CHARS,
  normalizeGeneralChatOutput,
  sanitizeGeneralChatInput,
  validateGeneralChatResponse
} from "../src/modules/assistant/chat/model.mjs";
import { postChat } from "../src/modules/assistant/chat/server.mjs";
import { createGeneralAgent } from "../src/mastra/agents/general/index.mjs";

const input = {
  schemaVersion: CHAT_SCHEMA_VERSION,
  requestId: "chat_test_01",
  locale: "zh-CN",
  messages: [{ role: "user", content: "帮我梳理今天的工作" }]
};

test("general chat contract is bounded and rejects stale or unknown fields", () => {
  assert.deepEqual(sanitizeGeneralChatInput(input), input);
  assert.deepEqual(normalizeGeneralChatOutput({ reply: "可以先列出今天完成的事项。" }, input).requestId, input.requestId);
  assert.throws(() => sanitizeGeneralChatInput({ ...input, extra: true }), /unknown or missing/);
  assert.throws(() => sanitizeGeneralChatInput({ ...input, messages: [{ role: "assistant", content: "x" }] }), /end with a user/);
  const response = normalizeGeneralChatOutput({ reply: "继续聊。" }, input);
  assert.deepEqual(validateGeneralChatResponse(response, input), response);
  assert.throws(() => validateGeneralChatResponse({ ...response, requestId: "old_request" }, input), /stale/);
  assert.throws(() => validateGeneralChatResponse({ ...response, schemaVersion: 2 }, input), /stale/);
  assert.throws(() => validateGeneralChatResponse({ ...response, extra: true }, input), /unknown/);
  assert.throws(() => validateGeneralChatResponse({ ...response, reply: "" }, input), /invalid/);
  const nextTurn = { ...input, messages: [{ role: "assistant", content: "答".repeat(MAX_CHAT_REPLY_CHARS) }, ...input.messages] };
  assert.deepEqual(sanitizeGeneralChatInput(nextTurn), nextTurn, "Every valid reply must remain valid as history on the next turn");
  assert.throws(() => sanitizeGeneralChatInput({ ...input, messages: [{ role: "user", content: "问".repeat(1201) }] }), /invalid/);
});

test("general chat route rejects invalid input and mismatched responses", async () => {
  const request = (body) => new Request("http://localhost/api/assistant/chat", { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer token" }, body: JSON.stringify(body) });
  const dependencies = { verifyAccessToken: async () => ({ id: "user-1" }), chat: async () => normalizeGeneralChatOutput({ reply: "ok" }, { ...input, requestId: "old_request" }) };
  assert.equal((await postChat(request({ ...input, extra: true }), dependencies)).status, 400);
  assert.equal((await postChat(request(input), dependencies)).status, 502);
  assert.equal((await postChat(request(input), { ...dependencies, verifyAccessToken: async () => null })).status, 401);
  assert.equal((await postChat(request(input), { ...dependencies, rateLimit: () => false })).status, 429);
});

test("general chat route verifies account and never writes product state", async () => {
  let committed = false;
  const request = new Request("http://localhost/api/assistant/chat", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost", authorization: "Bearer token" },
    body: JSON.stringify(input)
  });
  const response = await postChat(request, {
    verifyAccessToken: async () => ({ id: "user-1" }),
    chat: async (value) => {
      assert.deepEqual(value, input);
      return { ...normalizeGeneralChatOutput({ reply: "这是一个待确认的建议。" }, value), providerId: "deepseek:test" };
    },
    commitData: () => { committed = true; }
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply, "这是一个待确认的建议。");
  assert.equal(committed, false);
});

test("general Agent exposes only the existing preview Tool", async () => {
  const agent = createGeneralAgent({ model: { specificationVersion: "v1", doGenerate: async () => ({ finishReason: "stop", usage: {}, text: "{}" }) } });
  assert.deepEqual(Object.keys(await agent.listTools()), ["prepare-daily-log"]);
  assert.equal(await agent.getMemory(), undefined);
});
