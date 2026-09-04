import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { Agent } from "@mastra/core/agent";
import {
  DAILY_LOG_SCHEMA_VERSION,
  dailyLogInputSchema,
  dailyLogProposalSchema,
  prepareDailyLogProposal
} from "../src/modules/agent-bridge/daily-log/index.mjs";
import { createDailyLogAgent } from "../src/mastra/agents/daily-log/index.mjs";
import { createStructuredProposalAgent } from "../src/mastra/agents/structured-proposal-agent.mjs";
import { prepareDailyLogTool } from "../src/mastra/tools/daily-log/index.mjs";

const validInput = {
  schemaVersion: 1,
  targetDate: "2026-09-04",
  locale: "zh-CN",
  items: [
    { id: " work-1 ", status: "completed", summary: " 完成   Tool\n契约\u0000 " },
    { id: "work-2", status: "in-progress", summary: "等待页面确认" },
    { id: "work-3", status: "blocked", summary: "MCP 尚未批准" }
  ]
};

test("daily log core builds one strict unsaved Chinese record candidate", () => {
  const proposal = prepareDailyLogProposal(validInput);

  assert.equal(DAILY_LOG_SCHEMA_VERSION, 1);
  assert.deepEqual(proposal, dailyLogProposalSchema.parse(proposal));
  assert.deepEqual(proposal.sourceIds, ["work-1", "work-2", "work-3"]);
  assert.match(proposal.sourceFingerprint, /^fnv1a-[0-9a-f]{8}$/);
  assert.deepEqual(proposal.recordCandidate, {
    date: "2026-09-04",
    time: "",
    content: [
      "今日工作总结",
      "",
      "已完成：",
      "- 完成 Tool 契约",
      "",
      "进行中：",
      "- 等待页面确认",
      "",
      "受阻：",
      "- MCP 尚未批准"
    ].join("\n")
  });
  assert.equal(proposal.writePolicy, "preview-required");
  assert.equal("saved" in proposal, false);
  assert.equal("accountId" in proposal, false);
});

test("daily log core keeps English groups factual, ordered, and deterministic", () => {
  const input = {
    schemaVersion: 1,
    targetDate: "2026-09-04",
    locale: "en",
    items: [
      { id: "a", status: "completed", summary: "Implemented the contract" },
      { id: "b", status: "completed", summary: "Added regression coverage" },
      { id: "c", status: "in-progress", summary: "Reviewing the result" }
    ]
  };
  const first = prepareDailyLogProposal(input);

  for (let index = 0; index < 100; index += 1) {
    assert.deepEqual(prepareDailyLogProposal(structuredClone(input)), first);
  }
  assert.equal(first.recordCandidate.content, [
    "Daily work summary",
    "",
    "Completed:",
    "- Implemented the contract",
    "- Added regression coverage",
    "",
    "In progress:",
    "- Reviewing the result"
  ].join("\n"));
  assert.equal(first.recordCandidate.content.includes("Blocked:"), false);

  const variants = [
    { ...input, targetDate: "2026-09-05" },
    { ...input, locale: "zh-CN" },
    { ...input, items: input.items.map((item, index) => index === 0 ? { ...item, id: "changed" } : item) },
    { ...input, items: input.items.map((item, index) => index === 0 ? { ...item, status: "blocked" } : item) },
    { ...input, items: input.items.map((item, index) => index === 0 ? { ...item, summary: "Changed" } : item) }
  ];
  variants.forEach((variant) => {
    assert.notEqual(prepareDailyLogProposal(variant).sourceFingerprint, first.sourceFingerprint);
  });

  const normalizedEquivalent = {
    ...validInput,
    items: validInput.items.map((item) => ({
      ...item,
      id: item.id.trim(),
      summary: item.summary.replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").replace(/\s+/gu, " ").trim()
    }))
  };
  assert.deepEqual(prepareDailyLogProposal(normalizedEquivalent), prepareDailyLogProposal(validInput));
});

test("daily log input rejects invalid, ambiguous, duplicate, and oversized facts", () => {
  const invalidInputs = [
    { ...validInput, targetDate: "2026-02-30" },
    { ...validInput, locale: "fr" },
    { ...validInput, extra: true },
    { ...validInput, items: [{ id: "a", status: "completed", summary: "ok", extra: true }] },
    { ...validInput, items: [{ id: "a", status: "completed", summary: "ok" }, { id: " a ", status: "blocked", summary: "duplicate" }] },
    { ...validInput, items: [{ id: "a", status: "unknown", summary: "ok" }] },
    { ...validInput, items: [{ id: "a", status: "completed", summary: "   " }] },
    { ...validInput, items: [] },
    { ...validInput, items: Array.from({ length: 31 }, (_, index) => ({ id: `item-${index}`, status: "completed", summary: "ok" })) },
    { ...validInput, items: [{ id: "a".repeat(97), status: "completed", summary: "ok" }] },
    { ...validInput, items: [{ id: "a", status: "completed", summary: "内".repeat(801) }] },
    {
      ...validInput,
      items: Array.from({ length: 11 }, (_, index) => ({
        id: `item-${index}`,
        status: "completed",
        summary: "内".repeat(800)
      }))
    }
  ];

  invalidInputs.forEach((input) => {
    assert.throws(() => prepareDailyLogProposal(input));
    assert.equal(dailyLogInputSchema.safeParse(input).success, false);
  });
});

test("daily log core accepts its item-count boundary without truncating source facts", () => {
  const input = {
    schemaVersion: 1,
    targetDate: "2026-09-04",
    locale: "en",
    items: Array.from({ length: 30 }, (_, index) => ({
      id: `item-${index}`,
      status: index % 2 ? "completed" : "in-progress",
      summary: `Explicit fact ${index}`
    }))
  };
  const proposal = prepareDailyLogProposal(input);
  const contentLines = proposal.recordCandidate.content.split("\n");

  assert.equal(proposal.sourceIds.length, 30);
  input.items.forEach((item) => {
    assert.equal(contentLines.filter((line) => line === `- ${item.summary}`).length, 1);
  });
});

test("daily log core accepts exactly 8,000 source characters", () => {
  const input = {
    schemaVersion: 1,
    targetDate: "2026-09-04",
    locale: "en",
    items: Array.from({ length: 10 }, (_, index) => ({
      id: `id-00${index}`,
      status: "completed",
      summary: "a".repeat(794)
    }))
  };

  assert.equal(input.items.reduce((total, item) => total + item.id.length + item.summary.length, 0), 8000);
  assert.equal(prepareDailyLogProposal(input).sourceIds.length, 10);
});

test("Mastra Tool delegates to the shared core and honors the execution context abort signal", async () => {
  const expected = prepareDailyLogProposal(validInput);
  const actual = await prepareDailyLogTool.execute(validInput, { abortSignal: undefined });
  assert.deepEqual(actual, expected);
  assert.equal(prepareDailyLogTool.id, "prepare-daily-log");

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    () => prepareDailyLogTool.execute(validInput, { abortSignal: controller.signal }),
    (error) => error?.name === "AbortError"
  );
});

test("daily log core and Tool have no product read, write, or network dependency", async () => {
  const sources = await Promise.all([
    "../src/modules/agent-bridge/daily-log/contract.mjs",
    "../src/modules/agent-bridge/daily-log/core.mjs",
    "../src/modules/agent-bridge/daily-log/index.mjs",
    "../src/mastra/tools/daily-log/index.mjs"
  ].map((relativePath) => readFile(new URL(relativePath, import.meta.url), "utf8")));
  const source = sources.join("\n");

  assert.doesNotMatch(source, /\bfetch\s*\(/);
  assert.doesNotMatch(source, /\bcommitData\b/);
  assert.doesNotMatch(source, /\blocalStorage\b/);
  assert.doesNotMatch(source, /\bSupabase\b|@supabase|supabase-js/i);
  assert.doesNotMatch(sources.slice(0, 3).join("\n"), /@mastra\/core|src\/app|\.\.\/\.\.\/\.\.\/app/);
});

test("dedicated Mastra Agent has exactly one ID-keyed Tool and no memory", async () => {
  assert.throws(() => createDailyLogAgent({}), /model/i);

  const agent = createDailyLogAgent({ model: "openai/gpt-5.6-sol" });
  assert.ok(agent instanceof Agent);
  assert.equal(agent.id, "daily-log-agent");
  assert.deepEqual(Object.keys(await agent.listTools()), ["prepare-daily-log"]);
  assert.equal((await agent.listTools())["prepare-daily-log"], prepareDailyLogTool);
  assert.equal(await agent.getMemory(), undefined);

  const productionAgent = createStructuredProposalAgent({
    capabilityId: "existing-production-capability",
    model: "openai/gpt-5.6-sol",
    instructions: "Return one inert proposal."
  });
  assert.deepEqual(await productionAgent.listTools(), {});
  assert.equal(await productionAgent.getMemory(), undefined);
});
