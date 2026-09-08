"use client";

/**
 * @fileoverview Keeps the optional loopback Agent Bridge paired to the current
 * authenticated browser account. Product state remains owned by commitData;
 * this provider only pumps transient MCP requests and proposals.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { createAgentBridgeController } from "@/modules/agent-bridge/mcp/index.mjs";
import { useAuth } from "@/app/_providers/auth-provider";
import { useLogNoteDataContext } from "@/app/_providers/log-note-data-provider";

const AgentBridgeContext = createContext(null);
const PAIRING_STORAGE_PREFIX = "log-note:agent-bridge:user:";
const PAIRING_STORAGE_SUFFIX = ":v1";
const PUMP_INTERVAL_MS = 240;

function pairingStorageKey(userId) {
  return `${PAIRING_STORAGE_PREFIX}${encodeURIComponent(String(userId))}${PAIRING_STORAGE_SUFFIX}`;
}

function bridgeError(body, fallback = "BRIDGE_ERROR") {
  const code = String(body?.error?.code || fallback);
  const error = new Error(String(body?.error?.message || code));
  error.code = /^[A-Z0-9_]+$/u.test(code) ? code : fallback;
  return error;
}

async function bridgeCall(action, { token = "", ...body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers["x-log-note-bridge-token"] = token;
  let response;
  try {
    response = await fetch("/api/mcp", {
      method: "POST",
      headers,
      body: JSON.stringify({ action, ...body })
    });
  } catch {
    const error = new Error("Log Note browser bridge is unavailable");
    error.code = "BRIDGE_UNAVAILABLE";
    throw error;
  }
  let result;
  try {
    result = await response.json();
  } catch {
    const error = new Error("Log Note browser bridge returned invalid JSON");
    error.code = "BRIDGE_PROTOCOL_ERROR";
    throw error;
  }
  if (!response.ok || result?.error) throw bridgeError(result, `BRIDGE_HTTP_${response.status}`);
  return result;
}

function sessionFromPairing(pairing) {
  return pairing && typeof pairing === "object" && pairing.token
    ? { ...pairing, token: String(pairing.token) }
    : null;
}

function safeErrorPayload(error) {
  return {
    code: String(error?.code || "BRIDGE_ERROR"),
    message: String(error?.message || "Agent Bridge request failed")
  };
}

export function AgentBridgeProvider({ children }) {
  const { identity } = useAuth();
  const { data, commitData, hydrated, sync } = useLogNoteDataContext();
  const [pairing, setPairing] = useState(null);
  const [connection, setConnection] = useState("unpaired");
  const [error, setError] = useState("");
  const [proposals, setProposals] = useState([]);
  const activeSessionRef = useRef(null);
  const controllerRef = useRef(null);
  const dataRef = useRef(data);
  const syncRef = useRef(sync);
  const commitDataRef = useRef(commitData);
  const generationRef = useRef(0);
  const pumpingRef = useRef(false);

  dataRef.current = data;
  syncRef.current = sync;
  commitDataRef.current = commitData;

  const isCurrentSession = useCallback((session) => {
    const current = activeSessionRef.current;
    return Boolean(current
      && session
      && current.token === session.token
      && current.userId === session.userId
      && current.generation === session.generation);
  }, []);

  const clearLocalPairing = useCallback((userId, token = "") => {
    if (userId) {
      try { window.localStorage.removeItem(pairingStorageKey(userId)); } catch { /* local storage may be unavailable */ }
    }
    const current = activeSessionRef.current;
    if (!token || current?.token === token) activeSessionRef.current = null;
    controllerRef.current?.clear();
    setPairing(null);
    setProposals([]);
    setConnection("unpaired");
  }, []);

  const revokeToken = useCallback(async (token) => {
    if (!token) return;
    try { await bridgeCall("revoke", { token }); } catch { /* expiry and browser loss are safe cleanup outcomes */ }
  }, []);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    const previous = activeSessionRef.current;
    if (previous && previous.userId !== identity?.id) {
      void revokeToken(previous.token);
      try { window.localStorage.removeItem(pairingStorageKey(previous.userId)); } catch { /* best effort cleanup */ }
    }
    activeSessionRef.current = null;
    controllerRef.current?.clear();
    setPairing(null);
    setProposals([]);
    setError("");
    setConnection(identity?.id ? "unpaired" : "signed-out");
    if (!identity?.id || !hydrated) return undefined;

    controllerRef.current = createAgentBridgeController({
      getState: () => dataRef.current,
      getRevision: () => syncRef.current.document?.revision ?? 0,
      getUpdatedAt: () => syncRef.current.document?.updatedAt || new Date().toISOString(),
      isOffline: () => (typeof navigator !== "undefined" && !navigator.onLine) || syncRef.current.status === "offline",
      commitData: (updater) => commitDataRef.current(updater)
    });

    let stored = null;
    try {
      stored = sessionFromPairing(JSON.parse(window.localStorage.getItem(pairingStorageKey(identity.id)) || "null"));
    } catch {
      stored = null;
    }
    if (!stored) return undefined;
    const session = { ...stored, userId: identity.id, generation };
    activeSessionRef.current = session;
    setPairing(stored);
    setConnection("checking");
    bridgeCall("status", { token: stored.token })
      .then((result) => {
        if (!isCurrentSession(session)) return;
        setPairing((current) => current ? { ...current, ...result.status, token: session.token } : current);
        setConnection("paired");
      })
      .catch((statusError) => {
        if (!isCurrentSession(session)) return;
        clearLocalPairing(identity.id, session.token);
        setError(String(statusError?.message || "Pairing expired"));
      });
    return () => {
      if (isCurrentSession(session)) {
        void revokeToken(session.token);
        activeSessionRef.current = null;
      }
      controllerRef.current?.clear();
    };
  }, [clearLocalPairing, hydrated, identity?.id, isCurrentSession, revokeToken]);

  const refreshProposals = useCallback(() => {
    setProposals(controllerRef.current?.listProposals() || []);
  }, []);

  const pump = useCallback(async () => {
    const session = activeSessionRef.current;
    const controller = controllerRef.current;
    if (!session || !controller || pumpingRef.current) return;
    pumpingRef.current = true;
    try {
      const claimed = await bridgeCall("claim", { token: session.token });
      if (!isCurrentSession(session) || !claimed.request) return;
      const request = claimed.request;
      let result;
      let requestError = null;
      try {
        result = await controller.handle(request);
      } catch (requestFailure) {
        requestError = safeErrorPayload(requestFailure);
      }
      if (!isCurrentSession(session)) return;
      await bridgeCall("resolve", requestError
        ? { token: session.token, requestId: request.requestId, error: requestError }
        : { token: session.token, requestId: request.requestId, result });
      if (isCurrentSession(session)) refreshProposals();
    } catch (pumpError) {
      if (!isCurrentSession(session)) return;
      if (["PAIRING_UNAVAILABLE", "BRIDGE_HTTP_401"].includes(pumpError?.code)) {
        clearLocalPairing(session.userId, session.token);
      } else if (pumpError?.code !== "BRIDGE_UNAVAILABLE") {
        setError(String(pumpError?.message || "Agent Bridge request failed"));
        setConnection("error");
      }
    } finally {
      pumpingRef.current = false;
    }
  }, [clearLocalPairing, isCurrentSession, refreshProposals]);

  useEffect(() => {
    if (!pairing?.token || !identity?.id || !hydrated) return undefined;
    void pump();
    const timer = window.setInterval(() => { void pump(); }, PUMP_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [hydrated, identity?.id, pairing?.token, pump]);

  const startPairing = useCallback(async () => {
    if (!identity?.id || !hydrated) return false;
    const previous = activeSessionRef.current;
    if (previous) await revokeToken(previous.token);
    setError("");
    setConnection("pairing");
    try {
      const result = await bridgeCall("pair");
      const stored = sessionFromPairing(result.pairing);
      if (!stored) throw Object.assign(new Error("Pairing response was invalid"), { code: "BRIDGE_PROTOCOL_ERROR" });
      const session = { ...stored, userId: identity.id, generation: generationRef.current };
      activeSessionRef.current = session;
      try { window.localStorage.setItem(pairingStorageKey(identity.id), JSON.stringify(stored)); } catch { /* pairing can remain session-only */ }
      setPairing(stored);
      setProposals([]);
      setConnection("paired");
      return true;
    } catch (pairingError) {
      setConnection("error");
      setError(String(pairingError?.message || "Pairing failed"));
      return false;
    }
  }, [hydrated, identity?.id, revokeToken]);

  const revokePairing = useCallback(async () => {
    const session = activeSessionRef.current;
    if (session) await revokeToken(session.token);
    if (identity?.id) {
      try { window.localStorage.removeItem(pairingStorageKey(identity.id)); } catch { /* best effort */ }
    }
    clearLocalPairing(identity?.id || "", session?.token || "");
  }, [clearLocalPairing, identity?.id, revokeToken]);

  const refreshStatus = useCallback(async () => {
    const session = activeSessionRef.current;
    if (!session) return false;
    try {
      const result = await bridgeCall("status", { token: session.token });
      if (!isCurrentSession(session)) return false;
      setPairing((current) => current ? { ...current, ...result.status, token: session.token } : current);
      setConnection("paired");
      setError("");
      return true;
    } catch (statusError) {
      if (isCurrentSession(session)) {
        clearLocalPairing(session.userId, session.token);
        setError(String(statusError?.message || "Pairing expired"));
      }
      return false;
    }
  }, [clearLocalPairing, isCurrentSession]);

  const confirmProposal = useCallback((proposalId) => {
    try {
      const proposal = controllerRef.current?.confirmProposal(proposalId);
      refreshProposals();
      return proposal || null;
    } catch (proposalError) {
      setError(String(proposalError?.message || "Proposal could not be confirmed"));
      return null;
    }
  }, [refreshProposals]);

  const rejectProposal = useCallback((proposalId) => {
    try {
      const proposal = controllerRef.current?.rejectProposal(proposalId);
      refreshProposals();
      return proposal || null;
    } catch (proposalError) {
      setError(String(proposalError?.message || "Proposal could not be rejected"));
      return null;
    }
  }, [refreshProposals]);

  const value = useMemo(() => ({
    pairing,
    connection,
    error,
    proposals,
    startPairing,
    revokePairing,
    refreshStatus,
    confirmProposal,
    rejectProposal,
    refreshProposals
  }), [confirmProposal, connection, error, pairing, proposals, refreshProposals, refreshStatus, rejectProposal, revokePairing, startPairing]);

  return <AgentBridgeContext.Provider value={value}>{children}</AgentBridgeContext.Provider>;
}

export function useAgentBridge() {
  const value = useContext(AgentBridgeContext);
  if (!value) throw new Error("useAgentBridge must be used inside AgentBridgeProvider");
  return value;
}
