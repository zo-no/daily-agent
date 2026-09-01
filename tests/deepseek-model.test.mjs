import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  MAX_DEEPSEEK_RESPONSE_BYTES,
  createBoundedProviderFetch,
  runDeepSeekProposal,
  withDeepSeekModel
} from "../src/lib/deepseek-model.mjs";

test("DeepSeek model boundary validates secret, transport, and HTTPS/local URLs", async () => {
  const execute = async () => "unused";
  await assert.rejects(
    () => withDeepSeekModel({ apiKey: "", fetchImpl: async () => new Response() }, execute),
    (error) => error?.code === "AI_PROVIDER_NOT_CONFIGURED" && error?.status === 503
  );
  await assert.rejects(
    () => withDeepSeekModel({ apiKey: "secret", baseUrl: "http://example.com", fetchImpl: async () => new Response() }, execute),
    (error) => error?.code === "AI_PROVIDER_CONFIG_INVALID" && error?.status === 503
  );
  await assert.rejects(
    () => withDeepSeekModel({ apiKey: "secret", fetchImpl: null }, execute),
    (error) => error?.code === "AI_PROVIDER_TRANSPORT_UNAVAILABLE" && error?.status === 503
  );

  const result = await withDeepSeekModel({
    apiKey: "secret",
    baseUrl: "http://127.0.0.1:3100/v1/",
    model: "deepseek-chat",
    fetchImpl: async () => new Response()
  }, async ({ model, modelId, abortSignal }) => {
    assert.ok(model);
    assert.equal(modelId, "deepseek-chat");
    assert.equal(abortSignal.aborted, false);
    return "ok";
  });
  assert.equal(result, "ok");
});

test("DeepSeek proposal runner makes the embedded runtime one readable call", async () => {
  let calls = 0;
  const result = await runDeepSeekProposal({ note: "focus" }, {
    apiKey: "secret",
    fetchImpl: async () => {
      calls += 1;
      return new Response(JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion",
        created: 1,
        model: "test-model",
        choices: [{
          index: 0,
          message: { role: "assistant", content: JSON.stringify({ title: "Focus" }) },
          finish_reason: "stop"
        }]
      }), { status: 200, headers: { "content-type": "application/json" } });
    },
    capabilityId: "future-workflow",
    instructions: "Return the title as JSON.",
    inputSchema: z.object({ note: z.string() }).strict(),
    outputSchema: z.object({ title: z.string() }).strict(),
    normalize: (value, input, modelId) => ({ ...value, source: `${input.note}:${modelId}` })
  });
  assert.equal(calls, 1);
  assert.deepEqual(result, { title: "Focus", source: "focus:deepseek-chat" });
});

test("bounded provider transport rejects declared and streamed bodies above 512 KiB", async () => {
  const declared = createBoundedProviderFetch(async () => new Response("private", {
    headers: { "content-length": String(MAX_DEEPSEEK_RESPONSE_BYTES + 1) }
  }));
  await assert.rejects(
    () => declared("https://example.invalid"),
    (error) => error?.code === "AI_PROVIDER_RESPONSE_TOO_LARGE"
      && !error.message.includes("private")
  );

  const bytes = new Uint8Array(MAX_DEEPSEEK_RESPONSE_BYTES + 1);
  const streamed = createBoundedProviderFetch(async () => new Response(new ReadableStream({
    start(controller) {
      controller.enqueue(bytes.subarray(0, MAX_DEEPSEEK_RESPONSE_BYTES));
      controller.enqueue(bytes.subarray(MAX_DEEPSEEK_RESPONSE_BYTES));
      controller.close();
    }
  })));
  await assert.rejects(
    () => streamed("https://example.invalid"),
    (error) => error?.code === "AI_PROVIDER_RESPONSE_TOO_LARGE"
  );
});

test("DeepSeek request timeout propagates Abort and never returns a late result", async () => {
  let aborted = false;
  await assert.rejects(() => withDeepSeekModel({
    apiKey: "secret",
    timeoutMs: 5,
    fetchImpl: async () => new Response()
  }, ({ abortSignal }) => new Promise((resolve) => {
    abortSignal.addEventListener("abort", () => {
      aborted = true;
      setTimeout(() => resolve("late"), 1);
    }, { once: true });
  })), (error) => error?.code === "AI_PROVIDER_TIMEOUT" && error?.status === 504);
  assert.equal(aborted, true);
});
