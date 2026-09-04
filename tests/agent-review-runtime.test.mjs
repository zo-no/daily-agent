import test from "node:test";
import assert from "node:assert/strict";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import {
  normalizeAgentReplyOutput,
  normalizeAgentReviewOutput
} from "../src/modules/assistant/review/model.mjs";
import { createStructuredProposalAgent } from "../src/mastra/agents/structured-proposal-agent.mjs";
import { runStructuredProposal } from "../src/mastra/index.mjs";

const reviewSchema = z.object({
  intro: z.string(),
  items: z.array(z.object({
    entryId: z.string(),
    kind: z.enum(["question", "category"]),
    prompt: z.string(),
    categoryId: z.string().optional().default(""),
    questionGoal: z.enum(["clarify-category", "enrich-detail"]).optional().default("enrich-detail"),
    candidateCategoryIds: z.array(z.string()).optional().default([])
  }).strict())
}).strict();

const replySchema = z.object({
  outcome: z.enum(["ask", "append", "category", "none"]),
  reply: z.string(),
  proposedAppend: z.string().optional().default(""),
  categoryId: z.string().optional().default("")
}).strict();

const input = {
  mode: "analyze",
  date: "2026-08-22",
  locale: "zh-CN",
  entries: [{ id: "entry-a", time: "09:30", content: "学习和市场复盘", currentCategoryId: "daily" }],
  categories: [
    { id: "daily", domainName: "日常", name: "记录" },
    { id: "study", domainName: "成长", name: "学习" },
    { id: "trading", domainName: "投资", name: "交易" }
  ]
};

function openAiResponse(content) {
  return new Response(JSON.stringify({
    id: "chatcmpl-test",
    object: "chat.completion",
    created: 1,
    model: "test-model",
    choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }],
    usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 }
  }), { status: 200, headers: { "content-type": "application/json" } });
}

function stubModel(output, onCall = () => {}) {
  const provider = createOpenAICompatible({
    name: "mastra-test",
    apiKey: "test-key",
    baseURL: "https://example.invalid/v1",
    supportsStructuredOutputs: true,
    fetch: async (_url, options) => {
      onCall(options);
      return openAiResponse(JSON.stringify(output));
    }
  });
  return provider.chatModel("test-model");
}

function runProposal(config, inputData = input) {
  return runStructuredProposal({ ...config, input: inputData });
}

test("embedded Mastra keeps Agents tool-free and makes one analyze call", async () => {
  let calls = 0;
  const model = stubModel({
    intro: "需要确认一条分类。",
    items: [{
      entryId: "entry-a",
      kind: "question",
      prompt: "这条记录主要是在学习还是交易？",
      questionGoal: "clarify-category",
      candidateCategoryIds: ["study", "trading"]
    }]
  }, () => { calls += 1; });
  const agent = createStructuredProposalAgent({
    capabilityId: "diary-review",
    model,
    instructions: "Return one bounded Diary review JSON object."
  });
  assert.deepEqual(await agent.listTools(), {});
  assert.equal(await agent.getMemory(), undefined);

  const result = await runProposal({
    capabilityId: "diary-review",
    model,
    instructions: "Return one bounded Diary review JSON object.",
    inputSchema: z.object({ mode: z.enum(["analyze", "reply"]) }).passthrough(),
    outputSchema: reviewSchema,
    normalize: (value) => normalizeAgentReviewOutput(value, input, 123, "mastra:test"),
    modelSettings: { temperature: 0.1, maxOutputTokens: 1600 }
  });
  assert.equal(calls, 1);
  assert.equal(result.providerId, "mastra:test");
  assert.equal(result.items[0].questionGoal, "clarify-category");
  assert.deepEqual(result.items[0].candidateCategoryIds, ["study", "trading"]);
});

test("Mastra reply workflow still applies the injected project candidate and conflict normalizer", async () => {
  let calls = 0;
  const replyInput = {
    ...input,
    mode: "reply",
    entries: [input.entries[0]],
    activeEntryId: "entry-a",
    item: {
      kind: "question",
      prompt: "这条记录主要是在学习还是交易？",
      categoryId: "",
      questionGoal: "clarify-category",
      candidateCategoryIds: ["study", "trading"]
    },
    messages: [{ role: "user", content: "主要是市场交易" }]
  };
  const result = await runProposal({
    capabilityId: "diary-review",
    model: stubModel({
      outcome: "category",
      reply: "可以归到这个分类。",
      proposedAppend: "模型试图同时补正文",
      categoryId: "trading"
    }, () => { calls += 1; }),
    instructions: "Return one bounded Diary reply JSON object.",
    inputSchema: z.object({ mode: z.enum(["analyze", "reply"]) }).passthrough(),
    outputSchema: replySchema,
    normalize: (value) => normalizeAgentReplyOutput(value, replyInput),
    modelSettings: { temperature: 0.3, maxOutputTokens: 700 }
  }, replyInput);
  assert.equal(calls, 1);
  assert.equal(result.outcome, "none");
  assert.equal(result.categoryId, "");
  assert.equal(result.proposedAppend, "");
  assert.equal(result.terminal, true);
});

test("an aborted Mastra run never retries the model transport", async () => {
  let calls = 0;
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => runProposal({
      capabilityId: "diary-review",
      model: stubModel({ intro: "", items: [] }, () => { calls += 1; }),
      instructions: "Return one bounded Diary review JSON object.",
      inputSchema: z.object({ mode: z.enum(["analyze", "reply"]) }).passthrough(),
      outputSchema: reviewSchema,
      normalize: (value) => normalizeAgentReviewOutput(value, input, 123, "mastra:test"),
      abortSignal: controller.signal,
      modelSettings: { temperature: 0.1, maxOutputTokens: 1600 }
    }),
    (error) => error?.code === "AI_RUNTIME_ABORTED"
  );
  assert.ok(calls <= 1);
});

test("Mastra validates the analyze/reply envelope before model execution", async () => {
  let calls = 0;
  await assert.rejects(() => runProposal({
    capabilityId: "diary-review",
    model: stubModel({ intro: "", items: [] }, () => { calls += 1; }),
    instructions: "Return one bounded Diary review JSON object.",
    inputSchema: z.object({ mode: z.enum(["analyze", "reply"]) }).passthrough(),
    outputSchema: reviewSchema,
    normalize: (value) => value,
    modelSettings: { temperature: 0.1, maxOutputTokens: 1600 }
  }, { date: "2026-08-22" }));
  assert.equal(calls, 0);
});

test("Mastra accepts a new capability name and rejects invalid structured output without retries", async () => {
  let calls = 0;
  await runProposal({
    capabilityId: "future-workflow",
    model: stubModel({ intro: "", items: [] }, () => { calls += 1; }),
    instructions: "Return one bounded proposal JSON object.",
    inputSchema: z.object({ mode: z.literal("analyze") }).passthrough(),
    outputSchema: reviewSchema,
    normalize: (value) => value,
    modelSettings: { temperature: 0.1, maxOutputTokens: 1600 }
  }, { ...input, mode: "analyze" });
  assert.equal(calls, 1);

  calls = 0;
  await assert.rejects(
    () => runProposal({
      capabilityId: "daily-review",
      model: stubModel({ unexpected: true }, () => { calls += 1; }),
      instructions: "Return one bounded daily review JSON object.",
      inputSchema: z.object({ mode: z.literal("analyze") }).passthrough(),
      outputSchema: reviewSchema,
      normalize: (value) => value
    }, { ...input, mode: "analyze" }),
    (error) => error?.code === "AI_RUNTIME_INVALID_OUTPUT"
  );
  assert.equal(calls, 1);
});
