import {
  AGENT_BRIDGE_MAX_RESPONSE_BYTES,
  AGENT_BRIDGE_PAIRING_IDLE_TTL_MS,
  byteLength,
  cloneJson,
  stableFingerprint
} from "../../shared/agent-bridge/protocol.mjs";

const MAX_PENDING_REQUESTS = 32;
const MAX_COMPLETED_REQUESTS = 64;
const REQUEST_TTL_MS = 60_000;
const TOKEN_BYTES = 32;

function randomToken() {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(TOKEN_BYTES);
    crypto.getRandomValues(bytes);
    return Buffer.from(bytes).toString("base64url");
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function requestFingerprint(kind, payload) {
  return stableFingerprint({ kind, payload });
}

function safeResult(result) {
  const value = result === undefined ? null : cloneJson(result);
  const serialized = JSON.stringify(value);
  if (byteLength(serialized) > AGENT_BRIDGE_MAX_RESPONSE_BYTES) throw new Error("bridge result exceeds the allowed size");
  return value;
}

function sessionView(session, now) {
  return {
    sessionId: session.sessionId,
    status: session.status,
    createdAt: new Date(session.createdAt).toISOString(),
    expiresAt: new Date(session.expiresAt).toISOString(),
    browserLastSeenAt: session.browserLastSeenAt ? new Date(session.browserLastSeenAt).toISOString() : null,
    pendingCount: session.pending.size,
    completedCount: session.completed.size,
    expired: session.status === "active" && now >= session.expiresAt
  };
}

export class BridgeQueue {
  constructor({ clock = () => Date.now(), idleTtlMs = AGENT_BRIDGE_PAIRING_IDLE_TTL_MS } = {}) {
    this.clock = clock;
    this.idleTtlMs = idleTtlMs;
    this.sessions = new Map();
  }

  _sweep() {
    const now = this.clock();
    for (const session of this.sessions.values()) {
      if (session.status === "active" && now >= session.expiresAt) session.status = "expired";
      for (const [requestId, request] of session.pending) {
        if (now >= request.expiresAt) {
          session.pending.delete(requestId);
          session.completed.set(requestId, { status: "error", error: { code: "REQUEST_EXPIRED", message: "request expired" }, fingerprint: request.fingerprint });
        }
      }
      while (session.completed.size > MAX_COMPLETED_REQUESTS) session.completed.delete(session.completed.keys().next().value);
    }
  }

  _get(token) {
    this._sweep();
    const session = this.sessions.get(String(token || ""));
    if (!session || session.status !== "active" || this.clock() >= session.expiresAt) {
      throw new Error("PAIRING_UNAVAILABLE");
    }
    return session;
  }

  _touch(session, browser = false) {
    const now = this.clock();
    session.lastSeenAt = now;
    session.expiresAt = now + this.idleTtlMs;
    if (browser) session.browserLastSeenAt = now;
  }

  createPairing() {
    this._sweep();
    const now = this.clock();
    const token = randomToken();
    const session = {
      sessionId: `bridge_${token.slice(0, 12)}`,
      token,
      status: "active",
      createdAt: now,
      lastSeenAt: now,
      expiresAt: now + this.idleTtlMs,
      browserLastSeenAt: now,
      pending: new Map(),
      completed: new Map()
    };
    this.sessions.set(token, session);
    return { token, ...sessionView(session, now) };
  }

  status(token) {
    const session = this._get(token);
    this._touch(session, true);
    return sessionView(session, this.clock());
  }

  revoke(token) {
    const session = this.sessions.get(String(token || ""));
    if (!session) return { revoked: false };
    session.status = "revoked";
    session.pending.clear();
    session.completed.clear();
    this.sessions.delete(session.token);
    return { revoked: true, sessionId: session.sessionId };
  }

  enqueue({ token, requestId, kind, payload }) {
    const session = this._get(token);
    const normalizedRequestId = String(requestId || "");
    const normalizedKind = String(kind || "");
    if (!normalizedRequestId || normalizedRequestId.length > 180) throw new Error("INVALID_REQUEST_ID");
    if (!normalizedKind || normalizedKind.length > 80) throw new Error("INVALID_REQUEST_KIND");
    const fingerprint = requestFingerprint(normalizedKind, payload);
    const existing = session.pending.get(normalizedRequestId) || session.completed.get(normalizedRequestId);
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new Error("REQUEST_ID_REPLAY");
      this._touch(session, false);
      return { requestId: normalizedRequestId, status: existing.status, result: existing.result, error: existing.error };
    }
    if (session.pending.size >= MAX_PENDING_REQUESTS) throw new Error("BRIDGE_QUEUE_FULL");
    const serialized = JSON.stringify({ requestId: normalizedRequestId, kind: normalizedKind, payload });
    if (byteLength(serialized) > AGENT_BRIDGE_MAX_RESPONSE_BYTES) throw new Error("REQUEST_TOO_LARGE");
    const now = this.clock();
    session.pending.set(normalizedRequestId, {
      requestId: normalizedRequestId,
      kind: normalizedKind,
      payload: cloneJson(payload),
      fingerprint,
      status: "pending",
      claimedAt: null,
      createdAt: now,
      expiresAt: now + REQUEST_TTL_MS
    });
    this._touch(session, false);
    return { requestId: normalizedRequestId, status: "pending" };
  }

  claim(token) {
    const session = this._get(token);
    this._touch(session, true);
    const now = this.clock();
    for (const request of session.pending.values()) {
      if (request.status === "claimed" && now - request.claimedAt < REQUEST_TTL_MS) continue;
      request.status = "claimed";
      request.claimedAt = now;
      return cloneJson({ requestId: request.requestId, kind: request.kind, payload: request.payload, claimedAt: request.claimedAt });
    }
    return null;
  }

  resolve(token, { requestId, result, error = null }) {
    const session = this._get(token);
    const request = session.pending.get(String(requestId || ""));
    if (!request) {
      const existing = session.completed.get(String(requestId || ""));
      if (existing) return cloneJson(existing);
      throw new Error("REQUEST_NOT_FOUND");
    }
    if (request.status !== "claimed") throw new Error("REQUEST_NOT_CLAIMED");
    const completed = error
      ? { status: "error", error: { code: String(error.code || "BRIDGE_ERROR"), message: String(error.message || "bridge request failed") }, fingerprint: request.fingerprint }
      : { status: "complete", result: safeResult(result), fingerprint: request.fingerprint };
    session.pending.delete(request.requestId);
    session.completed.set(request.requestId, completed);
    this._touch(session, true);
    while (session.completed.size > MAX_COMPLETED_REQUESTS) session.completed.delete(session.completed.keys().next().value);
    return cloneJson(completed);
  }

  poll(token, requestId) {
    const session = this._get(token);
    this._touch(session, false);
    const id = String(requestId || "");
    const pending = session.pending.get(id);
    if (pending) return { requestId: id, status: pending.status };
    const completed = session.completed.get(id);
    if (completed) return { requestId: id, ...cloneJson(completed) };
    return { requestId: id, status: "not-found" };
  }

  cancel(token, requestId) {
    const session = this._get(token);
    const id = String(requestId || "");
    const pending = session.pending.get(id);
    if (!pending) return this.poll(token, id);
    session.pending.delete(id);
    const result = { status: "error", error: { code: "REQUEST_CANCELLED", message: "request cancelled" }, fingerprint: pending.fingerprint };
    session.completed.set(id, result);
    this._touch(session, false);
    return { requestId: id, ...cloneJson(result) };
  }
}

const GLOBAL_KEY = "__logNoteAgentBridgeQueueV1";
export function getBridgeQueue() {
  if (!globalThis[GLOBAL_KEY]) globalThis[GLOBAL_KEY] = new BridgeQueue();
  return globalThis[GLOBAL_KEY];
}
