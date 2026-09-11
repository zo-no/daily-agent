import assert from "node:assert/strict";
import test from "node:test";
import { Agent } from "@mastra/core/agent";
import {
  CHANGE_PREVIEW_SCHEMA_VERSION,
  preparePlanPreview,
  prepareRecordPreview,
  planPreviewInputSchema,
  changePreviewOutputSchema
} from "../src/modules/agent-bridge/change-preview/index.mjs";
import {
  preparePlanPreviewTool,
  prepareRecordPreviewTool
} from "../src/mastra/tools/change-preview/index.mjs";
import { createChangePreviewAgent } from "../src/mastra/agents/change-preview/index.mjs";

const state = {
  categories: [{ id: "cat-work", domainId: "domain-life", name: "工作" }],
  templates: [{ id: "template-note", name: "记录" }],
  planBlocks: []
};

const recordState = {
  categories: [{ id: "cat-work", domainId: "domain-life", name: "工作" }],
  templates: [{ id: "template-note", name: "记录" }]
};

test("plan preview prepares a normalized unsaved create", () => {
  const result = preparePlanPreview({
    schemaVersion: CHANGE_PREVIEW_SCHEMA_VERSION,
    operation: "create",
    state,
    draft: { date: "2026-09-10", startTime: "09:00", endTime: "10:00", title: "  规划迭代  ", flexibility: "movable" },
    existing: null
  });
  assert.deepEqual(result, changePreviewOutputSchema.parse(result));
  assert.equal(result.kind, "plan");
  assert.equal(result.candidate.id, "proposal-plan");
  assert.equal(result.candidate.title, "规划迭代");
  assert.equal(result.before, null);
  assert.equal(result.writePolicy, "preview-required");
  assert.equal("saved" in result, false);
});

test("record preview handles update and delete without persistence", () => {
  const existing = {
    id: "record-1", date: "2026-09-10", time: "09:00", content: "原记录", categoryId: "cat-work",
    templateId: "template-note", fieldValues: {}, tags: [], attachments: [], source: "local"
  };
  const updated = prepareRecordPreview({
    schemaVersion: 1, operation: "update", state: recordState,
    draft: { content: "新记录" }, existing
  });
  assert.equal(updated.kind, "record");
  assert.equal(updated.candidate.content, "新记录");
  assert.equal(updated.before.content, "原记录");
  assert.equal(updated.after.content, "新记录");

  const deleted = prepareRecordPreview({ schemaVersion: 1, operation: "delete", state: recordState, draft: {}, existing });
  assert.equal(deleted.candidate.id, "record-1");
  assert.equal(deleted.after, null);
  assert.equal(deleted.before.content, "原记录");
});

test("preview rejects unsafe or incomplete operations", () => {
  assert.throws(() => planPreviewInputSchema.parse({ schemaVersion: 1, operation: "create", state, draft: { extra: true }, existing: null }));
  assert.throws(() => preparePlanPreview({ schemaVersion: 1, operation: "update", state, draft: {}, existing: null }));
  assert.throws(() => preparePlanPreview({ schemaVersion: 1, operation: "delete", state, draft: { date: "2026-09-10" }, existing: { source: "local" } }));
  assert.throws(() => preparePlanPreview({ schemaVersion: 1, operation: "update", state, draft: {}, existing: { source: "google", id: "g1", date: "2026-09-10", startTime: "09:00", endTime: "10:00", title: "Google", flexibility: "fixed" } }));
  assert.throws(() => prepareRecordPreview({ schemaVersion: 1, operation: "create", state: recordState, draft: { date: "2026-09-10", time: "09:00", content: "内容", categoryId: "missing" }, existing: null }));
});

test("preview tools delegate, honor abort, and expose two stable IDs", async () => {
  const input = { schemaVersion: 1, operation: "create", state, draft: { date: "2026-09-10", startTime: "09:00", endTime: "10:00", title: "计划", flexibility: "movable" }, existing: null };
  assert.deepEqual(await preparePlanPreviewTool.execute(input, {}), preparePlanPreview(input));
  assert.equal(preparePlanPreviewTool.id, "prepare-plan-draft");
  assert.equal(prepareRecordPreviewTool.id, "prepare-record-draft");
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(() => preparePlanPreviewTool.execute(input, { abortSignal: controller.signal }), { name: "AbortError" });
});

test("change preview Agent has exactly two tools and no memory", async () => {
  assert.throws(() => createChangePreviewAgent({}), /model/i);
  const agent = createChangePreviewAgent({ model: { specificationVersion: "v1", doGenerate: async () => ({ finishReason: "stop", usage: {}, text: "{}" }) } });
  assert.ok(agent instanceof Agent);
  assert.deepEqual(Object.keys(await agent.listTools()), ["prepare-plan-draft", "prepare-record-draft"]);
  assert.equal(await agent.getMemory(), undefined);
});
