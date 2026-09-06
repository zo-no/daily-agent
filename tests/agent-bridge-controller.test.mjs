import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import {
  AgentBridgeControllerError,
  createAgentBridgeController
} from "../src/modules/agent-bridge/mcp/index.mjs";

function createHarness({ offline = false, clock = () => Date.now() } = {}) {
  let state = createInitialState();
  const categoryId = state.categories[0].id;
  state.entries = [{ id: "entry-1", date: "2026-09-05", time: "09:00", content: "原文", categoryId, tags: [], templateId: null, fieldValues: {}, attachments: [] }];
  state.planBlocks = [{ id: "plan-1", date: "2026-09-05", startTime: "10:00", endTime: "11:00", title: "原计划", source: "local", flexibility: "fixed", externalRef: null }];
  let revision = 12;
  const controller = createAgentBridgeController({
    getState: () => state,
    getRevision: () => revision,
    isOffline: () => offline,
    getUpdatedAt: () => "2026-09-05T09:00:00.000Z",
    commitData: (updater) => {
      state = updater(state);
      return true;
    },
    idFactory: (prefix) => `${prefix}-generated`,
    clock
  });
  return { controller, getState: () => state, setRevision: (value) => { revision = value; }, categoryId };
}

test("controller reads, previews, requires confirmation, commits once, and reads back", async () => {
  const harness = createHarness();
  const snapshot = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const beforeState = harness.getState();
  const proposal = await harness.controller.handle({
    requestId: "request-1",
    kind: "propose-plan-change",
    payload: {
      operation: "update",
      targetId: "plan-1",
      draft: { title: "新计划" },
      expectedRevision: snapshot.revision,
      sourceFingerprint: snapshot.fingerprint
    }
  });
  assert.equal(harness.getState().planBlocks[0].title, beforeState.planBlocks[0].title);
  await assert.rejects(
    () => harness.controller.handle({ kind: "commit-change", payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: 12, sourceFingerprint: proposal.sourceFingerprint } }),
    (error) => error instanceof AgentBridgeControllerError && error.code === "PROPOSAL_NOT_CONFIRMED"
  );
  harness.controller.confirmProposal(proposal.proposalId);
  const committed = await harness.controller.handle({
    kind: "commit-change",
    payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: 12, sourceFingerprint: proposal.sourceFingerprint }
  });
  assert.equal(committed.applied, true);
  assert.equal(committed.readBack.title, "新计划");
  assert.equal(harness.getState().planBlocks[0].title, "新计划");
  const repeated = await harness.controller.handle({
    kind: "commit-change",
    payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: 12, sourceFingerprint: proposal.sourceFingerprint }
  });
  assert.deepEqual(repeated, committed);
});

test("controller rejects stale revisions, offline writes, and out-of-scope reads", async () => {
  const harness = createHarness();
  const recordSnapshot = await harness.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  assert.equal(recordSnapshot.data[0].content, "原文");
  const proposal = await harness.controller.handle({
    requestId: "request-2",
    kind: "propose-record-change",
    payload: {
      operation: "update",
      targetId: "entry-1",
      draft: { content: "新正文" },
      expectedRevision: recordSnapshot.revision,
      sourceFingerprint: recordSnapshot.fingerprint
    }
  });
  harness.controller.confirmProposal(proposal.proposalId);
  harness.setRevision(13);
  await assert.rejects(
    () => harness.controller.handle({ kind: "commit-change", payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: 12, sourceFingerprint: proposal.sourceFingerprint } }),
    (error) => error.code === "STALE_REVISION"
  );
  await assert.rejects(
    () => harness.controller.handle({ kind: "get-record", payload: { id: "entry-1", from: "2026-08-01", to: "2026-08-10" } }),
    (error) => error.code === "INVALID_REQUEST"
  );
  const offline = createHarness({ offline: true });
  const snapshot = await offline.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const offlineProposal = await offline.controller.handle({
    requestId: "request-3",
    kind: "propose-plan-change",
    payload: { operation: "update", targetId: "plan-1", draft: { title: "离线计划" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
  });
  offline.controller.confirmProposal(offlineProposal.proposalId);
  await assert.rejects(
    () => offline.controller.handle({ kind: "commit-change", payload: { proposalId: offlineProposal.proposalId, confirmation: "confirmed", target: offlineProposal.target, expectedRevision: snapshot.revision, sourceFingerprint: offlineProposal.sourceFingerprint } }),
    (error) => error.code === "OFFLINE_WRITE_REFUSED"
  );
});

test("updating a local plan preserves its managed Google reference for later sync", async () => {
  const harness = createHarness();
  harness.getState().planBlocks[0].externalRef = {
    provider: "google",
    calendarId: "primary",
    eventId: "managed-event",
    etag: "etag-1"
  };
  const snapshot = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const proposal = await harness.controller.handle({
    requestId: "request-preserve-google-ref",
    kind: "propose-plan-change",
    payload: {
      operation: "update",
      targetId: "plan-1",
      draft: { title: "更新后的计划" },
      expectedRevision: snapshot.revision,
      sourceFingerprint: snapshot.fingerprint
    }
  });
  harness.controller.confirmProposal(proposal.proposalId);
  await harness.controller.handle({
    kind: "commit-change",
    payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: snapshot.revision, sourceFingerprint: proposal.sourceFingerprint }
  });
  assert.deepEqual(harness.getState().planBlocks[0].externalRef, {
    provider: "google",
    calendarId: "primary",
    eventId: "managed-event",
    etag: "etag-1"
  });
});

test("controller rechecks the source fingerprint before applying a confirmed proposal", async () => {
  const harness = createHarness();
  const snapshot = await harness.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const proposal = await harness.controller.handle({
    requestId: "request-fingerprint",
    kind: "propose-record-change",
    payload: {
      operation: "update",
      targetId: "entry-1",
      draft: { content: "Agent 提案正文" },
      expectedRevision: snapshot.revision,
      sourceFingerprint: snapshot.fingerprint
    }
  });
  harness.controller.confirmProposal(proposal.proposalId);
  harness.getState().entries[0].content = "作者在确认后手工修改";
  await assert.rejects(
    () => harness.controller.handle({
      kind: "commit-change",
      payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: 12, sourceFingerprint: proposal.sourceFingerprint }
    }),
    (error) => error.code === "STALE_FINGERPRINT"
  );
  assert.equal(harness.getState().entries[0].content, "作者在确认后手工修改");
});

test("controller rejects an expired proposal even after it was confirmed", async () => {
  let now = 1_000;
  const harness = createHarness({ clock: () => now });
  const snapshot = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const proposal = await harness.controller.handle({
    requestId: "request-expired",
    kind: "propose-plan-change",
    payload: {
      operation: "update",
      targetId: "plan-1",
      draft: { title: "过期计划" },
      expectedRevision: snapshot.revision,
      sourceFingerprint: snapshot.fingerprint
    }
  });
  harness.controller.confirmProposal(proposal.proposalId);
  now += 5 * 60 * 1000 + 1;
  await assert.rejects(
    () => harness.controller.handle({
      kind: "commit-change",
      payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: 12, sourceFingerprint: proposal.sourceFingerprint }
    }),
    (error) => error.code === "PROPOSAL_EXPIRED"
  );
  assert.equal(harness.getState().planBlocks[0].title, "原计划");
});

async function confirmAndCommit(controller, proposal) {
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

test("controller supports local plan create and delete with one read-back per commit", async () => {
  const harness = createHarness();
  const before = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const createdProposal = await harness.controller.handle({
    requestId: "request-plan-create",
    kind: "propose-plan-change",
    payload: {
      operation: "create",
      draft: { date: "2026-09-05", startTime: "13:00", endTime: "14:30", title: "新计划", flexibility: "resizable" },
      expectedRevision: before.revision,
      sourceFingerprint: before.fingerprint
    }
  });
  const created = await confirmAndCommit(harness.controller, createdProposal);
  assert.equal(created.applied, true);
  assert.equal(created.readBack.id, "plan-generated");
  assert.equal(harness.getState().planBlocks.some((plan) => plan.id === "plan-generated"), true);

  const afterCreate = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const deleteProposal = await harness.controller.handle({
    requestId: "request-plan-delete",
    kind: "propose-plan-change",
    payload: {
      operation: "delete",
      targetId: "plan-generated",
      draft: {},
      expectedRevision: afterCreate.revision,
      sourceFingerprint: afterCreate.fingerprint
    }
  });
  const deleted = await confirmAndCommit(harness.controller, deleteProposal);
  assert.deepEqual(deleted.readBack, { kind: "plan", id: "plan-generated", deleted: true });
  assert.equal(harness.getState().planBlocks.some((plan) => plan.id === "plan-generated"), false);
});

test("controller supports record create/update/delete while preserving attachments and exact confirmed content", async () => {
  const harness = createHarness();
  harness.getState().entries[0].attachments = [{ id: "attachment-existing", kind: "image", storage: "indexeddb", mediaType: "image/png", bytes: 12, name: "existing.png", alt: "existing", createdAt: 1 }];
  const before = await harness.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const createdProposal = await harness.controller.handle({
    requestId: "request-record-create",
    kind: "propose-record-change",
    payload: {
      operation: "create",
      draft: {
        date: "2026-09-05",
        time: "14:05",
        content: "**Markdown** 与 emoji 📝",
        categoryId: harness.categoryId,
        tags: ["focus"],
        fieldValues: { mood: "calm" }
      },
      expectedRevision: before.revision,
      sourceFingerprint: before.fingerprint
    }
  });
  const created = await confirmAndCommit(harness.controller, createdProposal);
  assert.equal(created.applied, true);
  assert.equal(created.readBack.content, "**Markdown** 与 emoji 📝");
  assert.deepEqual(created.readBack.tags, ["focus"]);
  assert.deepEqual(created.readBack.fieldValues, { mood: "calm" });
  const createdEntry = harness.getState().entries.find((entry) => entry.id === "entry-generated");
  assert.deepEqual(createdEntry.attachments, []);

  const afterCreate = await harness.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const updateProposal = await harness.controller.handle({
    requestId: "request-record-update",
    kind: "propose-record-change",
    payload: {
      operation: "update",
      targetId: "entry-1",
      draft: { content: "作者明确确认的新正文" },
      expectedRevision: afterCreate.revision,
      sourceFingerprint: afterCreate.fingerprint
    }
  });
  await confirmAndCommit(harness.controller, updateProposal);
  assert.equal(harness.getState().entries.find((entry) => entry.id === "entry-1").content, "作者明确确认的新正文");
  assert.equal(harness.getState().entries.find((entry) => entry.id === "entry-1").attachments[0].id, "attachment-existing");

  const afterUpdate = await harness.controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const deleteProposal = await harness.controller.handle({
    requestId: "request-record-delete",
    kind: "propose-record-change",
    payload: {
      operation: "delete",
      targetId: "entry-generated",
      draft: {},
      expectedRevision: afterUpdate.revision,
      sourceFingerprint: afterUpdate.fingerprint
    }
  });
  const deleted = await confirmAndCommit(harness.controller, deleteProposal);
  assert.deepEqual(deleted.readBack, { kind: "record", id: "entry-generated", deleted: true });
  assert.equal(harness.getState().entries.some((entry) => entry.id === "entry-generated"), false);
});

test("controller rejects all writes to Google-origin plans", async () => {
  const harness = createHarness();
  harness.getState().planBlocks.push({ id: "google-plan", date: "2026-09-05", startTime: "15:00", endTime: "16:00", title: "Google 计划", source: "google", flexibility: "fixed", externalRef: { provider: "google", calendarId: "primary", eventId: "google-event" } });
  const snapshot = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  await assert.rejects(
    () => harness.controller.handle({
      kind: "propose-plan-change",
      payload: { operation: "update", targetId: "google-plan", draft: { title: "不应修改" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
    }),
    (error) => error.code === "GOOGLE_PLAN_READ_ONLY"
  );
  await assert.rejects(
    () => harness.controller.handle({
      kind: "propose-plan-change",
      payload: { operation: "delete", targetId: "google-plan", draft: {}, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
    }),
    (error) => error.code === "GOOGLE_PLAN_READ_ONLY"
  );
});

test("controller rejects invalid plan flexibility instead of normalizing it silently", async () => {
  const harness = createHarness();
  const snapshot = await harness.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  await assert.rejects(
    () => harness.controller.handle({
      kind: "propose-plan-change",
      payload: { operation: "update", targetId: "plan-1", draft: { flexibility: "sometimes" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
    }),
    (error) => error.code === "INVALID_REQUEST"
  );
});
