import { makeId } from "../../../lib/data.mjs";
import { normalizePlanBlock, normalizePlanBlocks } from "../../../lib/plan-model.mjs";
import {
  createCategoriesSnapshot,
  createPlansSnapshot,
  createRecordsSnapshot,
  projectPlanBlock
} from "./read-snapshot.mjs";
import { createChangeProposal, proposalExpired, transitionProposal } from "./change-proposal.mjs";
import { buildChangeDiff, validatePlanDraft, validateRecordDraft } from "./change-validation.mjs";
import { cloneJson, stableFingerprint } from "./schema.mjs";

export class AgentBridgeControllerError extends Error {
  constructor(code, message = code) {
    super(message);
    this.name = "AgentBridgeControllerError";
    this.code = code;
  }
}

function fail(code, message = code) {
  throw new AgentBridgeControllerError(code, message);
}

function currentRevision(getRevision) {
  const revision = Number(getRevision?.() ?? 0);
  return Number.isInteger(revision) && revision >= 0 ? revision : 0;
}

function itemById(items, id) {
  return items.find((item) => String(item.id) === String(id)) || null;
}

function planScopeFingerprint(state, date) {
  return createPlansSnapshot({ state, date, revision: 0, updatedAt: "1970-01-01T00:00:00.000Z" }).fingerprint;
}

function recordScopeFingerprint(state, from, to) {
  return createRecordsSnapshot({ state, from, to, revision: 0, updatedAt: "1970-01-01T00:00:00.000Z" }).fingerprint;
}

function copyState(state) {
  return {
    ...state,
    entries: Array.isArray(state.entries) ? state.entries.map(cloneJson) : [],
    planBlocks: Array.isArray(state.planBlocks) ? state.planBlocks.map(cloneJson) : []
  };
}

function safeError(error) {
  if (error instanceof AgentBridgeControllerError) return error;
  return new AgentBridgeControllerError("INVALID_REQUEST", error?.message || "invalid Agent Bridge request");
}

/**
 * Browser-owned Agent Bridge business adapter. It has no React or transport
 * dependency: the caller supplies current state and the existing commitData
 * function, so all writes remain inside the authenticated local-first owner.
 */
export function createAgentBridgeController({
  getState,
  getRevision = () => 0,
  isOffline = () => false,
  getUpdatedAt = () => new Date().toISOString(),
  commitData,
  idFactory = makeId,
  clock = () => Date.now()
} = {}) {
  if (typeof getState !== "function" || typeof commitData !== "function") throw new Error("Agent Bridge controller requires state and commitData");
  const proposals = new Map();

  function state() {
    const value = getState();
    if (!value || typeof value !== "object") fail("STATE_UNAVAILABLE", "current account state is unavailable");
    return value;
  }

  function ensureRevision(expected) {
    const actual = currentRevision(getRevision);
    if (Number(expected) !== actual) fail("STALE_REVISION", "current account revision changed");
    return actual;
  }

  function ensureFingerprint(expected, actual) {
    if (String(expected || "") !== String(actual || "")) fail("STALE_FINGERPRINT", "current target fingerprint changed");
  }

  function createPlanProposal(payload) {
    const current = state();
    const operation = payload.operation;
    const targetId = payload.targetId ? String(payload.targetId) : null;
    let existing = targetId ? itemById(current.planBlocks || [], targetId) : null;
    if (operation !== "create" && !existing) fail("TARGET_NOT_FOUND", "plan target does not exist");
    if (existing?.source === "google") fail("GOOGLE_PLAN_READ_ONLY", "Google-origin plans are read-only");
    const scopeDate = existing?.date || payload.draft?.date;
    if (!scopeDate) fail("INVALID_REQUEST", "plan date is required");
    ensureRevision(payload.expectedRevision);
    ensureFingerprint(payload.sourceFingerprint, planScopeFingerprint(current, scopeDate));

    const generatedId = operation === "create" ? idFactory("plan") : existing.id;
    const validated = operation === "delete"
      ? validatePlanDraft({}, { operation, state: current, existing })
      : validatePlanDraft(payload.draft || {}, { operation, state: current, existing });
    const before = operation === "create" ? null : projectPlanBlock(existing);
    const preservedExternalRef = operation === "update" ? cloneJson(existing.externalRef || null) : null;
    const after = operation === "delete" ? null : projectPlanBlock({ ...validated, id: generatedId, source: "local", externalRef: preservedExternalRef });
    const diff = buildChangeDiff(before, after, ["date", "startTime", "endTime", "title", "flexibility"]);
    const proposal = createChangeProposal({
      requestId: payload.requestId || `request_${idFactory("request")}`,
      target: { kind: "plan", id: generatedId },
      operation,
      before: operation === "create" ? null : diff.before,
      after: operation === "delete" ? null : diff.after,
      sourceFingerprint: payload.sourceFingerprint,
      expectedRevision: payload.expectedRevision,
      now: clock()
    });
    proposals.set(proposal.proposalId, {
      proposal,
      rawAfter: operation === "delete" ? null : { ...validated, id: generatedId, source: "local", externalRef: preservedExternalRef },
      scope: { kind: "plans", date: scopeDate }
    });
    return proposal;
  }

  function createRecordProposal(payload) {
    const current = state();
    const operation = payload.operation;
    const targetId = payload.targetId ? String(payload.targetId) : null;
    const existing = targetId ? itemById(current.entries || [], targetId) : null;
    if (operation !== "create" && !existing) fail("TARGET_NOT_FOUND", "record target does not exist");
    const scopeFrom = existing?.date || payload.draft?.date;
    const scopeTo = scopeFrom;
    if (!scopeFrom) fail("INVALID_REQUEST", "record date is required");
    ensureRevision(payload.expectedRevision);
    ensureFingerprint(payload.sourceFingerprint, recordScopeFingerprint(current, scopeFrom, scopeTo));

    const generatedId = operation === "create" ? idFactory("entry") : existing.id;
    const validated = operation === "delete"
      ? validateRecordDraft({}, { operation, state: current, existing })
      : validateRecordDraft(payload.draft || {}, { operation, state: current, existing });
    const before = operation === "create" ? null : cloneJson(existing);
    const after = operation === "delete" ? null : { ...validated, id: generatedId };
    const diff = buildChangeDiff(before, after, ["date", "time", "content", "categoryId", "templateId", "fieldValues", "tags"]);
    const proposal = createChangeProposal({
      requestId: payload.requestId || `request_${idFactory("request")}`,
      target: { kind: "record", id: generatedId },
      operation,
      before: operation === "create" ? null : diff.before,
      after: operation === "delete" ? null : diff.after,
      sourceFingerprint: payload.sourceFingerprint,
      expectedRevision: payload.expectedRevision,
      now: clock()
    });
    proposals.set(proposal.proposalId, {
      proposal,
      rawAfter: after,
      scope: { kind: "records", from: scopeFrom, to: scopeTo }
    });
    return proposal;
  }

  function applyProposal(record) {
    const current = state();
    const { proposal, rawAfter } = record;
    ensureRevision(proposal.expectedRevision);
    const currentScopeFingerprint = record.scope.kind === "plans"
      ? planScopeFingerprint(current, record.scope.date)
      : recordScopeFingerprint(current, record.scope.from, record.scope.to);
    ensureFingerprint(proposal.sourceFingerprint, currentScopeFingerprint);
    if (isOffline()) fail("OFFLINE_WRITE_REFUSED", "Agent Bridge cannot claim a cloud save while offline");
    let target = null;
    let nextState = copyState(current);
    if (proposal.target.kind === "plan") {
      const existing = itemById(current.planBlocks || [], proposal.target.id);
      if (proposal.operation !== "create" && (!existing || existing.source === "google")) {
        fail(existing?.source === "google" ? "GOOGLE_PLAN_READ_ONLY" : "TARGET_NOT_FOUND", "plan target is no longer writable");
      }
      if (proposal.operation === "create") {
        nextState.planBlocks = normalizePlanBlocks([...(current.planBlocks || []), normalizePlanBlock(rawAfter)]);
      } else if (proposal.operation === "update") {
        nextState.planBlocks = normalizePlanBlocks((current.planBlocks || []).map((item) => item.id === proposal.target.id ? normalizePlanBlock({ ...item, ...rawAfter }) : item));
      } else {
        nextState.planBlocks = (current.planBlocks || []).filter((item) => item.id !== proposal.target.id);
      }
      target = itemById(nextState.planBlocks, proposal.target.id);
      const readBack = target ? projectPlanBlock(target) : { kind: "plan", id: proposal.target.id, deleted: true };
      const saved = commitData(() => nextState);
      if (!saved) fail("LOCAL_COMMIT_FAILED", "local commit was rejected");
      return { applied: true, alreadyApplied: false, revision: currentRevision(getRevision), fingerprint: stableFingerprint(readBack), readBack, syncPending: true };
    }

    const existing = itemById(current.entries || [], proposal.target.id);
    if (proposal.operation !== "create" && !existing) fail("TARGET_NOT_FOUND", "record target is no longer available");
    if (proposal.operation === "create") nextState.entries = [...(current.entries || []), cloneJson(rawAfter)];
    else if (proposal.operation === "update") nextState.entries = (current.entries || []).map((item) => item.id === proposal.target.id ? cloneJson(rawAfter) : item);
    else nextState.entries = (current.entries || []).filter((item) => item.id !== proposal.target.id);
    target = itemById(nextState.entries, proposal.target.id);
    const readBack = target
      ? { id: target.id, date: target.date, time: target.time, content: target.content, categoryId: target.categoryId, templateId: target.templateId || null, fieldValues: cloneJson(target.fieldValues || {}), tags: [...(target.tags || [])] }
      : { kind: "record", id: proposal.target.id, deleted: true };
    const saved = commitData(() => nextState);
    if (!saved) fail("LOCAL_COMMIT_FAILED", "local commit was rejected");
    return { applied: true, alreadyApplied: false, revision: currentRevision(getRevision), fingerprint: stableFingerprint(readBack), readBack, syncPending: true };
  }

  async function handle(request) {
    try {
      const kind = String(request?.kind || "");
      const payload = request?.payload && typeof request.payload === "object" ? request.payload : {};
      const current = state();
      const revision = currentRevision(getRevision);
      const offline = Boolean(isOffline());
      if (kind === "list-categories") return createCategoriesSnapshot({ state: current, revision, updatedAt: getUpdatedAt(), offline });
      if (kind === "list-plans") return createPlansSnapshot({ state: current, date: payload.date, revision, updatedAt: getUpdatedAt(), offline });
      if (kind === "list-records") return createRecordsSnapshot({ state: current, from: payload.from, to: payload.to, revision, updatedAt: getUpdatedAt(), offline });
      if (kind === "get-plan") {
        const snapshot = createPlansSnapshot({ state: current, date: payload.date, revision, updatedAt: getUpdatedAt(), offline });
        const item = itemById(snapshot.data, payload.id);
        if (!item) fail("TARGET_NOT_FOUND", "plan target does not exist in requested scope");
        return { ...snapshot, data: item };
      }
      if (kind === "get-record") {
        const snapshot = createRecordsSnapshot({ state: current, from: payload.from, to: payload.to, revision, updatedAt: getUpdatedAt(), offline });
        const item = itemById(snapshot.data, payload.id);
        if (!item) fail("TARGET_NOT_FOUND", "record target does not exist in requested scope");
        return { ...snapshot, data: item };
      }
      if (kind === "propose-plan-change") return createPlanProposal({ ...payload, requestId: request.requestId || payload.requestId });
      if (kind === "propose-record-change") return createRecordProposal({ ...payload, requestId: request.requestId || payload.requestId });
      if (kind === "commit-change") {
        const record = proposals.get(String(payload.proposalId));
        if (!record) fail("PROPOSAL_NOT_FOUND", "proposal does not exist or has expired");
        if (record.proposal.status === "applied") return cloneJson(record.result);
        if (proposalExpired(record.proposal, clock())) {
          record.proposal = transitionProposal(record.proposal, "expired", { now: clock() });
          proposals.set(record.proposal.proposalId, record);
          fail("PROPOSAL_EXPIRED", "proposal has expired");
        }
        if (payload.confirmation !== "confirmed") fail("CONFIRMATION_REQUIRED", "explicit confirmation is required");
        if (record.proposal.target.kind !== payload.target?.kind || record.proposal.target.id !== payload.target?.id) fail("TARGET_MISMATCH", "commit target does not match proposal");
        if (Number(payload.expectedRevision) !== record.proposal.expectedRevision) fail("STALE_REVISION", "commit revision does not match proposal");
        ensureFingerprint(payload.sourceFingerprint, record.proposal.sourceFingerprint);
        if (record.proposal.status !== "confirmed") fail("PROPOSAL_NOT_CONFIRMED", "confirm this proposal in the Log Note Agent Bridge panel first");
        const result = applyProposal(record);
        record.proposal = transitionProposal(record.proposal, "applied");
        record.result = result;
        proposals.set(record.proposal.proposalId, record);
        return result;
      }
      fail("UNKNOWN_REQUEST", "unsupported Agent Bridge request");
    } catch (error) {
      throw safeError(error);
    }
  }

  return Object.freeze({
    handle,
    confirmProposal(proposalId) {
      const record = proposals.get(String(proposalId));
      if (!record) fail("PROPOSAL_NOT_FOUND", "proposal does not exist");
      record.proposal = transitionProposal(record.proposal, "confirmed", { now: clock() });
      return cloneJson(record.proposal);
    },
    rejectProposal(proposalId) {
      const record = proposals.get(String(proposalId));
      if (!record) fail("PROPOSAL_NOT_FOUND", "proposal does not exist");
      record.proposal = transitionProposal(record.proposal, "rejected", { now: clock() });
      return cloneJson(record.proposal);
    },
    listProposals() {
      return [...proposals.values()].map(({ proposal }) => cloneJson(proposal));
    },
    clear() {
      proposals.clear();
    }
  });
}
