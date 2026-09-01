"use client";

/** Row-local conversation and explicit resolution controls for one Agent review item. */

import { useEffect, useRef, useState } from "react";

export function AgentDiaryReview({
  busy,
  categoryPath,
  item,
  lastCategoryUndo,
  messages,
  onAppend,
  onApplyCategory,
  onKeep,
  onNewRecord,
  onSend,
  onStop,
  onUndoCategory,
  proposedAppend,
  replyOutcome = "",
  t,
  total,
  index,
  planMode = false,
  proposal = null,
  currentPlan = null,
  onApplyPlan,
  onKeepPlan
}) {
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);
  const detailActions = !planMode && item?.kind === "question";
  const planActions = planMode;
  const detailResolutionReady = detailActions && replyOutcome === "append" && Boolean(proposedAppend);
  const planResolutionReady = planActions && Boolean(proposal);
  const diaryReplyTerminal = !planMode && (item?.kind === "category" || ["append", "category", "none"].includes(replyOutcome));
  const replyOpen = planMode ? !planResolutionReady : detailActions && !diaryReplyTerminal;
  const diaryActionCount = (detailActions ? (detailResolutionReady ? 3 : 1) : item?.kind === "category" ? 2 : 0)
    + (lastCategoryUndo ? 1 : 0);

  useEffect(() => {
    setDraft("");
    if (replyOpen) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }, [item?.id, replyOpen]);

  if (!item) return null;
  const progressLabel = `${index + 1} / ${total}`;
  const send = async (event) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    setDraft("");
    await onSend(content);
  };

  return (
    <section
      className="agent-review-panel"
      data-agent-kind={item.kind}
      data-agent-reply-outcome={replyOutcome || "pending"}
      data-agent-resolution-ready={(detailResolutionReady || planResolutionReady) ? "true" : "false"}
      aria-label={t("agent.reviewItem", { current: index + 1, total })}
    >
      <button className="agent-review-stop" type="button" onClick={onStop} aria-label={t("agent.stop")} title={t("agent.stop")}>
        <span className="agent-review-stop-icon" aria-hidden="true">×</span>
      </button>
      <div className="agent-review-conversation">
        <header className="agent-review-panel-header">
          <span className="agent-review-role" aria-hidden="true">Agent</span>
          <p className="agent-review-prompt">{item.prompt}</p>
          <span className="agent-review-progress" aria-label={t("agent.reviewItem", { current: index + 1, total })}>{progressLabel}</span>
        </header>

        {item.kind === "question" && !messages.length && (
          <p className="agent-review-hint">{t(item.questionGoal === "clarify-category" ? "agent.classificationHint" : "agent.detailHint")}</p>
        )}

        {planMode && proposal && currentPlan && (
          <p className="agent-review-plan-proposal">
            {proposal.title && <><span>{currentPlan.title}</span> → <strong>{proposal.title}</strong></>}
            {proposal.startMinute !== undefined && <><span>{currentPlan.startTime}–{currentPlan.endTime}</span> → <strong>{minutesToTime(proposal.startMinute)}–{minutesToTime(proposal.endMinute)}</strong></>}
          </p>
        )}

        {item.kind === "category" && categoryPath && (
          <p className="agent-review-category">{categoryPath}</p>
        )}

        {!!messages.length && !planResolutionReady && (
          <div className="agent-review-messages" aria-live="polite">
            {messages.filter((message) => !planMode || !proposal || message.role !== "user").map((message, messageIndex) => (
              <p key={`${message.role}:${messageIndex}`} data-role={message.role}>{message.content}</p>
            ))}
          </div>
        )}

        {replyOpen && <form className="agent-review-reply" onSubmit={send}>
          <label className="visually-hidden" htmlFor={`agent-reply-${item.id}`}>{t("agent.replyLabel")}</label>
          <textarea
            id={`agent-reply-${item.id}`}
            ref={inputRef}
            rows="1"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={planMode
              ? t("agent.planChatPlaceholder")
              : item.questionGoal === "clarify-category" ? t("agent.chatPlaceholder") : t("agent.detailPlaceholder")}
            disabled={busy}
          />
          {(busy || draft.trim()) && <button type="submit" disabled={busy}>{busy ? t("agent.replying") : t("agent.send")}</button>}
        </form>}
      </div>

      <div
        className="agent-review-actions"
        data-agent-action-count={planActions ? (planResolutionReady ? "2" : "1") : String(diaryActionCount)}
        data-agent-action-kind={item.kind}
      >
        {planResolutionReady && (
          <button type="button" className="primary agent-action-apply-plan" onClick={() => onApplyPlan(proposal)}>{t("agent.planUpdate")}</button>
        )}
        {planActions && <button type="button" className="agent-action-keep" onClick={onKeepPlan}>{t("agent.planKeep")}</button>}
        {!planActions && detailResolutionReady && (
          <>
            <button type="button" className="primary agent-action-append" onClick={() => onAppend(proposedAppend)}>{t("agent.append")}</button>
            <button type="button" className="agent-action-new" onClick={() => onNewRecord(proposedAppend)}>{t("agent.newRecord")}</button>
          </>
        )}
        {detailActions && <button type="button" className="agent-action-keep" onClick={onKeep}>{t("agent.keepOriginal")}</button>}
        {item.kind === "category" && item.categoryId && (
          <button type="button" className="primary agent-action-apply" onClick={() => onApplyCategory(item.categoryId)}>
            {t("agent.applyCategory")}
          </button>
        )}
        {item.kind === "category" && <button type="button" className="agent-action-keep" onClick={onKeep}>{t("agent.keepOriginal")}</button>}
        {lastCategoryUndo && <button type="button" className="agent-action-undo" onClick={onUndoCategory}>{t("agent.undoCategory")}</button>}
      </div>
    </section>
  );
}

function minutesToTime(value) {
  const minutes = Math.max(0, Math.min(1439, Number(value) || 0));
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function AgentReviewComplete({ lastCategoryUndo, onRestart, onStop, onUndoCategory, t }) {
  return (
    <section className="agent-review-complete" role="status" aria-live="polite">
      <div>
        <strong>{t("agent.completeTitle")}</strong>
        <p>{t("agent.completeHint")}</p>
      </div>
      <div className="agent-review-actions">
        <button type="button" className="primary" onClick={onRestart}>{t("agent.reviewAgain")}</button>
        {lastCategoryUndo && <button type="button" onClick={onUndoCategory}>{t("agent.undoCategory")}</button>}
        <button type="button" onClick={onStop}>{t("common.done")}</button>
      </div>
    </section>
  );
}
