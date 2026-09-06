import { z } from "zod";
import {
  AGENT_BRIDGE_PROPOSAL_TTL_MS,
  AGENT_BRIDGE_SCHEMA_VERSION,
  cloneJson,
  operationSchema,
  targetSchema
} from "./schema.mjs";

const proposalIdSchema = z.string().min(1).max(180);
const requestIdSchema = z.string().min(1).max(180);
const valueMapSchema = z.record(z.string(), z.unknown());
const statusSchema = z.enum(["proposed", "confirmed", "applied", "cancelled", "expired", "rejected", "conflict"]);

export const proposalSchema = z.object({
  schemaVersion: z.literal(AGENT_BRIDGE_SCHEMA_VERSION),
  proposalId: proposalIdSchema,
  requestId: requestIdSchema,
  target: targetSchema,
  operation: operationSchema,
  before: valueMapSchema.nullable(),
  after: valueMapSchema.nullable(),
  sourceFingerprint: z.string().min(1).max(240),
  expectedRevision: z.number().int().nonnegative(),
  expiresAt: z.string().datetime(),
  writePolicy: z.literal("preview-required"),
  status: statusSchema
}).strict();

function newId(prefix) {
  const value = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}_${value}`;
}

export function createChangeProposal({
  proposalId = newId("proposal"),
  requestId,
  target,
  operation,
  before = null,
  after = null,
  sourceFingerprint,
  expectedRevision,
  now = Date.now(),
  expiresAt = new Date(Number(now) + AGENT_BRIDGE_PROPOSAL_TTL_MS).toISOString()
}) {
  const proposal = {
    schemaVersion: AGENT_BRIDGE_SCHEMA_VERSION,
    proposalId,
    requestId,
    target: cloneJson(target),
    operation,
    before: before === null ? null : cloneJson(before),
    after: after === null ? null : cloneJson(after),
    sourceFingerprint,
    expectedRevision,
    expiresAt,
    writePolicy: "preview-required",
    status: "proposed"
  };
  return proposalSchema.parse(proposal);
}

const ALLOWED_TRANSITIONS = Object.freeze({
  proposed: new Set(["confirmed", "cancelled", "expired", "rejected", "conflict"]),
  confirmed: new Set(["applied", "cancelled", "expired", "conflict"]),
  applied: new Set(),
  cancelled: new Set(),
  expired: new Set(),
  rejected: new Set(),
  conflict: new Set()
});

export function transitionProposal(value, nextStatus, { now = Date.now() } = {}) {
  const proposal = proposalSchema.parse(value);
  if (proposal.status === "proposed" && Number(now) >= Date.parse(proposal.expiresAt)) {
    if (nextStatus !== "expired") throw new Error("proposal has expired");
    nextStatus = "expired";
  }
  if (!ALLOWED_TRANSITIONS[proposal.status]?.has(nextStatus)) {
    throw new Error(`invalid proposal transition: ${proposal.status} -> ${nextStatus}`);
  }
  return proposalSchema.parse({ ...proposal, status: nextStatus });
}

export function proposalExpired(value, now = Date.now()) {
  const proposal = proposalSchema.parse(value);
  return Number(now) >= Date.parse(proposal.expiresAt);
}
