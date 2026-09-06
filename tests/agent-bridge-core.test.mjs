import test from "node:test";
import assert from "node:assert/strict";
import { createInitialState } from "../src/lib/data.mjs";
import { createChangeProposal, proposalSchema } from "../src/modules/agent-bridge/mcp/change-proposal.mjs";
import {
  validatePlanDraft,
  validateRecordDraft,
  buildChangeDiff
} from "../src/modules/agent-bridge/mcp/change-validation.mjs";

function stateFixture() {
  const state = createInitialState();
  state.planBlocks = [{
    id: "plan-local",
    date: "2026-09-05",
    startTime: "10:00",
    endTime: "11:00",
    title: "原计划",
    source: "local",
    flexibility: "fixed",
    externalRef: null
  }];
  return state;
}

test("plan and record drafts reject unknown fields, Google writes, and missing categories", () => {
  const state = stateFixture();
  assert.throws(() => validatePlanDraft({
    date: "2026-09-05",
    startTime: "10:00",
    endTime: "11:00",
    title: "新计划",
    source: "google"
  }, { operation: "create", state }));
  assert.throws(() => validatePlanDraft({
    date: "2026-09-05",
    startTime: "10:00",
    endTime: "11:00",
    title: "新计划",
    unknown: "拒绝"
  }, { operation: "create", state }));
  assert.throws(() => validateRecordDraft({
    date: "2026-09-05",
    time: "09:30",
    content: "记录",
    categoryId: "missing-category"
  }, { operation: "create", state }));
  assert.throws(() => validateRecordDraft({
    date: "2026-09-05",
    time: "09:30",
    content: "记录",
    categoryId: state.categories[0].id,
    attachments: [{ id: "blob" }]
  }, { operation: "create", state }));
});

test("single-target proposal contains exact before/after and preview-required policy", () => {
  const state = stateFixture();
  const before = state.planBlocks[0];
  const after = validatePlanDraft({ title: "新计划", startTime: "10:30", endTime: "11:30" }, {
    operation: "update",
    state,
    existing: before
  });
  const diff = buildChangeDiff(before, after, ["title", "startTime", "endTime"]);
  const proposal = createChangeProposal({
    requestId: "request-1",
    target: { kind: "plan", id: before.id },
    operation: "update",
    before: diff.before,
    after: diff.after,
    sourceFingerprint: "v1:source",
    expectedRevision: 12,
    now: 1_000,
    proposalId: "proposal-1"
  });

  assert.deepEqual(proposal.before, { title: "原计划", startTime: "10:00", endTime: "11:00" });
  assert.deepEqual(proposal.after, { title: "新计划", startTime: "10:30", endTime: "11:30" });
  assert.equal(proposal.writePolicy, "preview-required");
  assert.equal(proposal.expectedRevision, 12);
  assert.equal(proposal.expiresAt, new Date(301_000).toISOString());
  assert.deepEqual(proposalSchema.parse(proposal), proposal);
});
