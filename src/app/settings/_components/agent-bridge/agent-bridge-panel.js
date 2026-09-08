"use client";

import { useState } from "react";
import { useI18n } from "@/app/_providers/i18n";
import { useAgentBridge } from "./agent-bridge-provider";
import { AgentBridgeProposal } from "./agent-bridge-proposal";

function formatDateTime(value, locale) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export function AgentBridgePanel() {
  const { locale, t } = useI18n();
  const {
    pairing,
    connection,
    error,
    proposals,
    startPairing,
    revokePairing,
    refreshStatus,
    confirmProposal,
    rejectProposal
  } = useAgentBridge();
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState("");

  async function pair() {
    setBusy(true);
    try { await startPairing(); } finally { setBusy(false); }
  }

  async function revoke() {
    if (!window.confirm(t("confirm.agentBridgeRevoke"))) return;
    setBusy(true);
    try { await revokePairing(); } finally { setBusy(false); }
  }

  async function refresh() {
    setBusy(true);
    try { await refreshStatus(); } finally { setBusy(false); }
  }

  async function copyToken() {
    if (!pairing?.token || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(pairing.token);
      setCopyState("copied");
      window.setTimeout(() => setCopyState(""), 1800);
    } catch {
      setCopyState("failed");
    }
  }

  const statusKey = connection === "paired"
    ? "agentBridge.status.paired"
    : connection === "checking"
      ? "agentBridge.status.checking"
      : connection === "pairing"
        ? "agentBridge.status.pairing"
        : connection === "error"
          ? "agentBridge.status.error"
          : connection === "signed-out"
            ? "agentBridge.status.signedOut"
            : "agentBridge.status.unpaired";

  return (
    <section className="agent-bridge-panel" aria-labelledby="agent-bridge-title" data-agent-bridge-status={connection}>
      <div className="agent-bridge-panel-heading">
        <div>
          <h3 id="agent-bridge-title">{t("agentBridge.title")}</h3>
          <p>{t("agentBridge.description")}</p>
        </div>
        <span className="agent-bridge-connection-status">{t(statusKey)}</span>
      </div>

      {!pairing ? (
        <div className="agent-bridge-start">
          <p>{t("agentBridge.unpairedDetail")}</p>
          <button className="account-secondary-action" type="button" disabled={busy || connection === "signed-out"} onClick={pair}>
            {t(busy ? "agentBridge.pairing" : "agentBridge.startPairing")}
          </button>
        </div>
      ) : (
        <div className="agent-bridge-session">
          <div className="agent-bridge-token-row">
            <div>
              <span className="agent-bridge-label">{t("agentBridge.pairingToken")}</span>
              <code>{pairing.token}</code>
            </div>
            <button className="text-button" type="button" onClick={copyToken}>{t(copyState === "copied" ? "agentBridge.copied" : "agentBridge.copy")}</button>
          </div>
          <p className="agent-bridge-warning">{t("agentBridge.tokenWarning")}</p>
          <dl className="agent-bridge-session-meta">
            <div><dt>{t("agentBridge.session")}</dt><dd>{pairing.sessionId || "—"}</dd></div>
            <div><dt>{t("agentBridge.expires")}</dt><dd>{formatDateTime(pairing.expiresAt, locale)}</dd></div>
            <div><dt>{t("agentBridge.lastBrowserSeen")}</dt><dd>{formatDateTime(pairing.browserLastSeenAt, locale)}</dd></div>
          </dl>
          <div className="agent-bridge-session-actions">
            <button className="text-button" type="button" disabled={busy} onClick={refresh}>{t("agentBridge.refresh")}</button>
            <button className="text-button is-danger" type="button" disabled={busy} onClick={revoke}>{t("agentBridge.revoke")}</button>
          </div>
        </div>
      )}

      {error && <p className="agent-bridge-error" role="status">{error}</p>}

      {proposals.length > 0 && (
        <section className="agent-bridge-proposals" aria-labelledby="agent-bridge-proposals-title">
          <div className="agent-bridge-proposals-heading">
            <h4 id="agent-bridge-proposals-title">{t("agentBridge.proposalsTitle")}</h4>
            <span>{proposals.filter((proposal) => ["proposed", "confirmed"].includes(proposal.status)).length}</span>
          </div>
          <div className="agent-bridge-proposal-list">
            {proposals.map((proposal) => (
              <AgentBridgeProposal
                key={proposal.proposalId}
                proposal={proposal}
                onConfirm={confirmProposal}
                onReject={rejectProposal}
              />
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
