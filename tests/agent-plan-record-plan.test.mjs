import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import { createAgentBridgeController } from "../src/modules/agent-bridge/mcp/index.mjs";

function harness() {
  let state = createInitialState();
  state.planBlocks = [{
    id: "plan-local",
    date: "2026-09-05",
    startTime: "09:00",
    endTime: "10:00",
    title: "原计划",
    source: "local",
    flexibility: "fixed",
    externalRef: null
  }, {
    id: "plan-google",
    date: "2026-09-05",
    startTime: "11:00",
    endTime: "12:00",
    title: "Google 计划",
    source: "google",
    flexibility: "fixed",
    externalRef: { provider: "google", calendarId: "primary", eventId: "event-1", etag: "etag-1" }
  }];
  let revision = 4;
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
  return {
    controller,
    getState: () => state,
    getCommits: () => commits,
    setRevision: (value) => { revision = value; }
  };
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

test("plan authoring is one-target CRUD with preview-only proposal and read-back", async () => {
  const h = harness();
  const before = await h.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const createProposal = await h.controller.handle({
    kind: "propose-plan-change",
    payload: {
      operation: "create",
      draft: { date: "2026-09-05", startTime: "13:00", endTime: "14:30", title: "新计划", flexibility: "resizable" },
      expectedRevision: before.revision,
      sourceFingerprint: before.fingerprint
    }
  });
  assert.equal(h.getCommits(), 0);
  assert.equal(createProposal.writePolicy, "preview-required");
  assert.equal(createProposal.before, null);
  assert.equal(createProposal.after.title, "新计划");

  const created = await commit(h.controller, createProposal);
  assert.equal(created.applied, true);
  assert.equal(created.readBack.id, "plan-test");
  assert.equal(created.readBack.startTime, "13:00");
  assert.equal(h.getCommits(), 1);

  const afterCreate = await h.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const updateProposal = await h.controller.handle({
    kind: "propose-plan-change",
    payload: {
      operation: "update",
      targetId: "plan-test",
      draft: { title: "更新后的计划", startTime: "13:30", endTime: "15:00" },
      expectedRevision: afterCreate.revision,
      sourceFingerprint: afterCreate.fingerprint
    }
  });
  const updated = await commit(h.controller, updateProposal);
  assert.equal(updated.readBack.title, "更新后的计划");
  assert.equal(updated.readBack.endTime, "15:00");

  const afterUpdate = await h.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const deleteProposal = await h.controller.handle({
    kind: "propose-plan-change",
    payload: {
      operation: "delete",
      targetId: "plan-test",
      draft: {},
      expectedRevision: afterUpdate.revision,
      sourceFingerprint: afterUpdate.fingerprint
    }
  });
  const deleted = await commit(h.controller, deleteProposal);
  assert.deepEqual(deleted.readBack, { kind: "plan", id: "plan-test", deleted: true });
  assert.equal(h.getState().planBlocks.some((plan) => plan.id === "plan-test"), false);
});

test("Google-origin plans and stale plan proposals remain read-only and zero-write", async () => {
  const h = harness();
  const snapshot = await h.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  await assert.rejects(
    () => h.controller.handle({
      kind: "propose-plan-change",
      payload: { operation: "update", targetId: "plan-google", draft: { title: "不应修改" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
    }),
    (error) => error.code === "GOOGLE_PLAN_READ_ONLY"
  );

  const proposal = await h.controller.handle({
    kind: "propose-plan-change",
    payload: { operation: "update", targetId: "plan-local", draft: { title: "会过期" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
  });
  h.controller.confirmProposal(proposal.proposalId);
  h.setRevision(snapshot.revision + 1);
  await assert.rejects(
    () => h.controller.handle({
      kind: "commit-change",
      payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: snapshot.revision, sourceFingerprint: proposal.sourceFingerprint }
    }),
    (error) => error.code === "STALE_REVISION"
  );
  assert.equal(h.getCommits(), 0);
  assert.equal(h.getState().planBlocks.find((plan) => plan.id === "plan-local").title, "原计划");
});

test("plan proposals reject invalid time blocks and expire before commit", async () => {
  let now = 1_000;
  const h = harness();
  const controller = createAgentBridgeController({
    getState: h.getState,
    getRevision: () => 4,
    commitData: (updater) => {
      updater(h.getState());
      return true;
    },
    idFactory: (prefix) => `${prefix}-expiry`,
    clock: () => now
  });
  const snapshot = await controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  await assert.rejects(
    () => controller.handle({
      kind: "propose-plan-change",
      payload: {
        operation: "create",
        draft: { date: "2026-09-05", startTime: "16:00", endTime: "15:00", title: "非法时间块", flexibility: "fixed" },
        expectedRevision: snapshot.revision,
        sourceFingerprint: snapshot.fingerprint
      }
    }),
    (error) => error.code === "INVALID_REQUEST"
  );
  const proposal = await controller.handle({
    kind: "propose-plan-change",
    payload: { operation: "update", targetId: "plan-local", draft: { title: "过期" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
  });
  controller.confirmProposal(proposal.proposalId);
  now += 5 * 60 * 1000 + 1;
  await assert.rejects(
    () => controller.handle({
      kind: "commit-change",
      payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: snapshot.revision, sourceFingerprint: proposal.sourceFingerprint }
    }),
    (error) => error.code === "PROPOSAL_EXPIRED"
  );
  assert.equal(h.getState().planBlocks.find((plan) => plan.id === "plan-local").title, "原计划");
});
