import test from "node:test";
import assert from "node:assert/strict";
import { BridgeQueue } from "../src/infrastructure/mcp/bridge-queue.mjs";
import { createInitialState } from "../src/lib/data.mjs";
import { createAgentBridgeController } from "../src/modules/agent-bridge/mcp/index.mjs";

test("bridge queue is replay-safe, cancellable, expiring, and revocable", () => {
  let now = 0;
  const queue = new BridgeQueue({ clock: () => now, idleTtlMs: 1_000 });
  const pairing = queue.createPairing();
  const first = queue.enqueue({ token: pairing.token, requestId: "request-1", kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  assert.equal(first.status, "pending");
  assert.equal(queue.enqueue({ token: pairing.token, requestId: "request-1", kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } }).status, "pending");
  assert.throws(
    () => queue.enqueue({ token: pairing.token, requestId: "request-1", kind: "list-records", payload: { from: "2026-09-04", to: "2026-09-05" } }),
    /REQUEST_ID_REPLAY/
  );
  const cancelled = queue.cancel(pairing.token, "request-1");
  assert.equal(cancelled.error.code, "REQUEST_CANCELLED");
  assert.equal(queue.poll(pairing.token, "request-1").error.code, "REQUEST_CANCELLED");

  queue.enqueue({ token: pairing.token, requestId: "request-2", kind: "list-plans", payload: { date: "2026-09-05" } });
  now += 1_001;
  assert.throws(() => queue.poll(pairing.token, "request-2"), /PAIRING_UNAVAILABLE/);

  const nextPairing = queue.createPairing();
  queue.enqueue({ token: nextPairing.token, requestId: "request-3", kind: "list-plans", payload: { date: "2026-09-05" } });
  assert.equal(queue.revoke(nextPairing.token).revoked, true);
  assert.throws(() => queue.claim(nextPairing.token), /PAIRING_UNAVAILABLE/);
});

test("proposal state is account-local and confirmation/offline failures do not write", async () => {
  function makeController(offline = false) {
    let state = createInitialState();
    state.planBlocks = [{ id: "plan-1", date: "2026-09-05", startTime: "09:00", endTime: "10:00", title: "原计划", source: "local", flexibility: "fixed", externalRef: null }];
    let commits = 0;
    const controller = createAgentBridgeController({
      getState: () => state,
      getRevision: () => 1,
      isOffline: () => offline,
      commitData: (updater) => { state = updater(state); commits += 1; return true; }
    });
    return { controller, getState: () => state, getCommits: () => commits };
  }

  const accountA = makeController();
  const accountB = makeController();
  const snapshot = await accountA.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const proposal = await accountA.controller.handle({
    kind: "propose-plan-change",
    payload: { operation: "update", targetId: "plan-1", draft: { title: "A 的提案" }, expectedRevision: snapshot.revision, sourceFingerprint: snapshot.fingerprint }
  });
  const accountABeforeProposal = JSON.stringify(accountA.getState());
  await assert.rejects(
    () => accountB.controller.handle({ kind: "commit-change", payload: { proposalId: proposal.proposalId, confirmation: "confirmed", target: proposal.target, expectedRevision: snapshot.revision, sourceFingerprint: proposal.sourceFingerprint } }),
    (error) => error.code === "PROPOSAL_NOT_FOUND"
  );
  assert.equal(accountB.getState().planBlocks[0].title, "原计划");
  assert.equal(accountB.getCommits(), 0);
  assert.equal(JSON.stringify(accountA.getState()), accountABeforeProposal);

  const offlineSnapshot = await accountA.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const offlineController = makeController(true);
  const offlineRead = await offlineController.controller.handle({ kind: "list-plans", payload: { date: "2026-09-05" } });
  const offlineProposal = await offlineController.controller.handle({
    kind: "propose-plan-change",
    payload: { operation: "update", targetId: "plan-1", draft: { title: "离线提案" }, expectedRevision: offlineRead.revision, sourceFingerprint: offlineRead.fingerprint }
  });
  offlineController.controller.confirmProposal(offlineProposal.proposalId);
  await assert.rejects(
    () => offlineController.controller.handle({ kind: "commit-change", payload: { proposalId: offlineProposal.proposalId, confirmation: "confirmed", target: offlineProposal.target, expectedRevision: offlineRead.revision, sourceFingerprint: offlineProposal.sourceFingerprint } }),
    (error) => error.code === "OFFLINE_WRITE_REFUSED"
  );
  assert.equal(offlineController.getState().planBlocks[0].title, "原计划");
  assert.equal(offlineController.getCommits(), 0);
  assert.equal(accountA.getState().planBlocks[0].title, "原计划");
  assert.equal(accountA.getCommits(), 0);
  assert.equal(offlineSnapshot.data[0].title, "原计划");
});
