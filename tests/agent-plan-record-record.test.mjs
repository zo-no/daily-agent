import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import { createAgentBridgeController } from "../src/modules/agent-bridge/mcp/index.mjs";

function harness() {
  let state = createInitialState();
  const categoryId = state.categories[0].id;
  const templateId = state.templates[0]?.id || null;
  state.entries = [{
    id: "entry-original",
    date: "2026-09-05",
    time: "08:00",
    content: "原始 **Markdown** 📝",
    categoryId,
    templateId,
    fieldValues: { mood: "calm" },
    tags: ["original"],
    attachments: [{ id: "attachment-1", kind: "image", storage: "indexeddb", mediaType: "image/png", bytes: 12, name: "attachment.png", alt: "existing", createdAt: 1 }]
  }];
  let revision = 8;
  let commits = 0;
  const controller = createAgentBridgeController({
    getState: () => state,
    getRevision: () => revision,
    commitData: (updater) => {
      state = updater(state);
      commits += 1;
      return true;
    },
    idFactory: (prefix) => `${prefix}-test`
  });
  return { controller, getState: () => state, getCommits: () => commits, categoryId, templateId };
}

async function commit(controller, proposal) {
  controller.confirmProposal(proposal.proposalId);
  return controller.handle({
    kind: "commit-change",
    payload: {
      proposalId: proposal.proposalId,
      confirmation: "confirmed",
      target: proposal.target,
      expectedRevision: proposal.expectedRevision,
      sourceFingerprint: proposal.sourceFingerprint
    }
  });
}

test("record authoring preserves exact content, existing category, fields, tags, and attachments", async () => {
  const h = harness();
  const before = await h.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const createProposal = await h.controller.handle({
    kind: "propose-record-change",
    payload: {
      operation: "create",
      draft: {
        date: "2026-09-05",
        time: "14:05",
        content: "**新记录**：原文不改写 📝",
        categoryId: h.categoryId,
        templateId: h.templateId,
        fieldValues: { mood: "focused" },
        tags: ["agent", "confirmed"]
      },
      expectedRevision: before.revision,
      sourceFingerprint: before.fingerprint
    }
  });
  assert.equal(h.getCommits(), 0);
  const created = await commit(h.controller, createProposal);
  assert.equal(created.readBack.content, "**新记录**：原文不改写 📝");
  assert.equal(created.readBack.categoryId, h.categoryId);
  assert.deepEqual(created.readBack.fieldValues, { mood: "focused" });
  assert.deepEqual(created.readBack.tags, ["agent", "confirmed"]);
  assert.deepEqual(h.getState().entries.find((entry) => entry.id === "entry-test").attachments, []);

  const afterCreate = await h.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const updateProposal = await h.controller.handle({
    kind: "propose-record-change",
    payload: {
      operation: "update",
      targetId: "entry-original",
      draft: { content: "用户明确确认的新正文" },
      expectedRevision: afterCreate.revision,
      sourceFingerprint: afterCreate.fingerprint
    }
  });
  const updated = await commit(h.controller, updateProposal);
  assert.equal(updated.readBack.content, "用户明确确认的新正文");
  const original = h.getState().entries.find((entry) => entry.id === "entry-original");
  assert.deepEqual(original.attachments, [{ id: "attachment-1", kind: "image", storage: "indexeddb", mediaType: "image/png", bytes: 12, name: "attachment.png", alt: "existing", createdAt: 1 }]);
  assert.deepEqual(original.tags, ["original"]);

  const afterUpdate = await h.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const deleteProposal = await h.controller.handle({
    kind: "propose-record-change",
    payload: { operation: "delete", targetId: "entry-test", draft: {}, expectedRevision: afterUpdate.revision, sourceFingerprint: afterUpdate.fingerprint }
  });
  const deleted = await commit(h.controller, deleteProposal);
  assert.deepEqual(deleted.readBack, { kind: "record", id: "entry-test", deleted: true });
  assert.equal(h.getState().entries.some((entry) => entry.id === "entry-test"), false);
});

test("record proposals reject invented categories, unknown fields, and interval schema", async () => {
  const h = harness();
  const snapshot = await h.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  await assert.rejects(
    () => h.controller.handle({
      kind: "propose-record-change",
      payload: { operation: "create", draft: { date: "2026-09-05", time: "09:00", content: "非法分类", categoryId: "not-existing" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
    }),
    (error) => error.code === "INVALID_REQUEST"
  );
  await assert.rejects(
    () => h.controller.handle({
      kind: "propose-record-change",
      payload: { operation: "create", draft: { date: "2026-09-05", time: "09:00", endTime: "10:00", content: "不应添加区间", categoryId: h.categoryId }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
    }),
    (error) => error.code === "INVALID_REQUEST"
  );
  assert.equal(h.getCommits(), 0);
});
