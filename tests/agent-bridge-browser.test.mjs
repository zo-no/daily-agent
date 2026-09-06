import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import { BridgeQueue } from "../src/infrastructure/mcp/bridge-queue.mjs";
import { createAgentBridgeController } from "../src/modules/agent-bridge/mcp/index.mjs";

function harness() {
  let state = createInitialState();
  const categoryId = state.categories[0].id;
  state.entries = [{
    id: "entry-browser",
    date: "2026-09-05",
    time: "09:00",
    content: "浏览器侧原文",
    categoryId,
    templateId: null,
    fieldValues: {},
    tags: [],
    attachments: []
  }];
  let revision = 7;
  const controller = createAgentBridgeController({
    getState: () => state,
    getRevision: () => revision,
    getUpdatedAt: () => "2026-09-05T09:00:00.000Z",
    commitData: (updater) => {
      state = updater(state);
      return true;
    },
    idFactory: (prefix) => `${prefix}-browser`
  });
  return { controller, getState: () => state, categoryId };
}

test("browser queue pump reads a bounded account snapshot", async () => {
  let now = 1_000;
  const queue = new BridgeQueue({ clock: () => now, idleTtlMs: 10_000 });
  const session = queue.createPairing();
  const { controller } = harness();
  queue.enqueue({ token: session.token, requestId: "read-1", kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } });
  const request = queue.claim(session.token);
  const result = await controller.handle(request);
  queue.resolve(session.token, { requestId: request.requestId, result });
  const completed = queue.poll(session.token, request.requestId);
  assert.equal(completed.status, "complete");
  assert.equal(completed.result.data[0].content, "浏览器侧原文");
  assert.equal(completed.result.revision, 7);
  now += 1;
});

test("browser queue pump keeps proposal inert until the settings confirmation", async () => {
  const queue = new BridgeQueue({ idleTtlMs: 10_000 });
  const session = queue.createPairing();
  const { controller, getState } = harness();
  queue.enqueue({ token: session.token, requestId: "proposal-1", kind: "propose-record-change", payload: {
    operation: "update",
    targetId: "entry-browser",
    draft: { content: "新的明确正文" },
    expectedRevision: 7,
    sourceFingerprint: (await controller.handle({ kind: "list-records", payload: { from: "2026-09-05", to: "2026-09-05" } })).fingerprint
  } });
  const request = queue.claim(session.token);
  const proposal = await controller.handle(request);
  queue.resolve(session.token, { requestId: request.requestId, result: proposal });
  assert.equal(getState().entries[0].content, "浏览器侧原文");

  queue.enqueue({ token: session.token, requestId: "commit-1", kind: "commit-change", payload: {
    proposalId: proposal.proposalId,
    confirmation: "confirmed",
    target: proposal.target,
    expectedRevision: 7,
    sourceFingerprint: proposal.sourceFingerprint
  } });
  const beforeConfirmation = queue.claim(session.token);
  let failure;
  try {
    await controller.handle(beforeConfirmation);
  } catch (error) {
    failure = error;
  }
  assert.equal(failure.code, "PROPOSAL_NOT_CONFIRMED");
  queue.resolve(session.token, { requestId: beforeConfirmation.requestId, error: { code: failure.code, message: failure.message } });
  assert.equal(getState().entries[0].content, "浏览器侧原文");

  controller.confirmProposal(proposal.proposalId);
  queue.enqueue({ token: session.token, requestId: "commit-2", kind: "commit-change", payload: {
    proposalId: proposal.proposalId,
    confirmation: "confirmed",
    target: proposal.target,
    expectedRevision: 7,
    sourceFingerprint: proposal.sourceFingerprint
  } });
  const confirmed = queue.claim(session.token);
  const committed = await controller.handle(confirmed);
  assert.equal(committed.applied, true);
  assert.equal(committed.readBack.content, "新的明确正文");
  assert.equal(getState().entries[0].content, "新的明确正文");
});
