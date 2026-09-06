"use client";

import { useI18n } from "@/app/i18n";

const DIFF_LABEL_KEYS = {
  date: "agentBridge.diff.date",
  startTime: "agentBridge.diff.startTime",
  endTime: "agentBridge.diff.endTime",
  time: "agentBridge.diff.time",
  title: "agentBridge.diff.title",
  content: "agentBridge.diff.content",
  categoryId: "agentBridge.diff.categoryId",
  templateId: "agentBridge.diff.templateId",
  flexibility: "agentBridge.diff.flexibility",
  tags: "agentBridge.diff.tags",
  fieldValues: "agentBridge.diff.fieldValues"
};

function displayValue(value) {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function formatExpiry(expiresAt, locale) {
  const date = new Date(expiresAt || "");
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(date);
}

export function AgentBridgeProposal({ proposal, onConfirm, onReject }) {
  const { locale, t } = useI18n();
  const before = proposal.before || {};
  const after = proposal.after || {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const isPending = proposal.status === "proposed";
  const isConfirmed = proposal.status === "confirmed";
  const kindLabel = proposal.target.kind === "plan" ? t("agentBridge.plan") : t("agentBridge.record");
  const operationLabel = t(`agentBridge.operation.${proposal.operation}`);

  return (
    <article className={`agent-bridge-proposal is-${proposal.status}`} data-proposal-id={proposal.proposalId}>
      <div className="agent-bridge-proposal-heading">
        <div>
          <span className="agent-bridge-eyebrow">{kindLabel} · {operationLabel}</span>
          <h4>{t("agentBridge.proposalTitle", { id: proposal.target.id })}</h4>
        </div>
        <span className="agent-bridge-proposal-status">{t(`agentBridge.status.${proposal.status}`)}</span>
      </div>
      <dl className="agent-bridge-proposal-meta">
        <div><dt>{t("agentBridge.revision")}</dt><dd>{proposal.expectedRevision}</dd></div>
        <div><dt>{t("agentBridge.expires")}</dt><dd>{formatExpiry(proposal.expiresAt, locale)}</dd></div>
      </dl>
      {keys.length > 0 && (
        <div className="agent-bridge-diff" aria-label={t("agentBridge.diffLabel")}>
          {keys.map((key) => (
            <div className="agent-bridge-diff-row" key={key}>
              <span>{DIFF_LABEL_KEYS[key] ? t(DIFF_LABEL_KEYS[key]) : key}</span>
              <del>{displayValue(before[key])}</del>
              <strong>{displayValue(after[key])}</strong>
            </div>
          ))}
        </div>
      )}
      {isPending && (
        <div className="agent-bridge-proposal-actions">
          <button className="text-button" type="button" onClick={() => onReject(proposal.proposalId)}>{t("agentBridge.reject")}</button>
          <button className="primary-button" type="button" onClick={() => onConfirm(proposal.proposalId)}>{t("agentBridge.confirm")}</button>
        </div>
      )}
      {isConfirmed && <p className="agent-bridge-proposal-note">{t("agentBridge.confirmedWaiting")}</p>}
    </article>
  );
}
