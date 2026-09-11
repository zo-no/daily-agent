/**
 * @fileoverview 首页底部导出与新增操作区。
 */

import { compactDateLabel } from "../date-label";
import { useEffect, useRef, useState } from "react";
import { localTimeWithSeconds } from "@/lib/data.mjs";

// RecordViewRailToggle and ChatModeRailToggle remain canonical in HomeHeader;
// this dock only owns the shared composer surface.

const LONG_PRESS_MS = 600;
const MOVE_TOLERANCE = 10;

function QuickRecordButton({ onQuickRecord, t }) {
  const [progress, setProgress] = useState(0);
  const frameRef = useRef(null);
  const pressRef = useRef(null);
  const suppressClickRef = useRef(false);

  function stopProgress() {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
  }

  function resetPress() {
    stopProgress();
    pressRef.current = null;
    setProgress(0);
  }

  useEffect(() => () => stopProgress(), []);

  function tick(now) {
    const press = pressRef.current;
    if (!press) return;
    const next = Math.min(1, (now - press.startedAt) / LONG_PRESS_MS);
    setProgress(next);
    if (next >= 1) {
      press.triggered = true;
      frameRef.current = null;
      return;
    }
    frameRef.current = window.requestAnimationFrame(tick);
  }

  function cancelPointerPress() {
    if (!pressRef.current) return;
    suppressClickRef.current = true;
    resetPress();
  }

  function handlePointerDown(event) {
    if (event.button !== 0) return;
    suppressClickRef.current = false;
    stopProgress();
    pressRef.current = {
      pointerId: event.pointerId,
      startedAt: performance.now(),
      startX: event.clientX,
      startY: event.clientY,
      triggered: false,
      cancelled: false
    };
    setProgress(0);
    frameRef.current = window.requestAnimationFrame(tick);
  }

  function handlePointerMove(event) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > MOVE_TOLERANCE) {
      press.cancelled = true;
      cancelPointerPress();
    }
  }

  function handlePointerUp(event) {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    event.preventDefault();
    const triggered = press.triggered;
    const cancelled = press.cancelled;
    suppressClickRef.current = true;
    resetPress();
    if (!triggered && !cancelled) onQuickRecord();
  }

  function handleClick(event) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      event.preventDefault();
      return;
    }
    onQuickRecord();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" || event.key === " ") suppressClickRef.current = false;
  }

  const circumference = 2 * Math.PI * 31;
  return (
    <button
      className="fab quick-record-fab"
      data-bottom-action="create"
      data-edge-rail-item="record"
      type="button"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelPointerPress}
      onPointerLeave={cancelPointerPress}
      onKeyDown={handleKeyDown}
      aria-label={t("home.quickRecord")}
    >
      <img src="/ui/diary/record-stamp.png" alt="" aria-hidden="true" />
      <svg className="quick-record-progress" viewBox="0 0 72 72" aria-hidden="true">
        <circle className="quick-record-progress-track" cx="36" cy="36" r="31" />
        <circle
          className="quick-record-progress-value"
          cx="36"
          cy="36"
          r="31"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
    </button>
  );
}

/** Keeps primary actions visually local while callbacks remain owned by HomePage. */
export function HomeActionDock({ chatActive, chatBusy, chatInput, dayPlanActive, exportToday, locale, onChatInputChange, onChatSend, onQuickRecordOpen, openPrimaryCreate, saveQuickRecord, selectedDate, t }) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  async function submitQuickRecord() {
    const value = content.trim();
    if (!value || saving) {
      onQuickRecordOpen?.();
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    setSaving(true);
    const saved = saveQuickRecord
      ? await saveQuickRecord({ content: value, time: localTimeWithSeconds() })
      : false;
    setSaving(false);
    if (saved) {
      setContent("");
      window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    }
  }

  return (
    <div
      className="action-dock action-rail"
      aria-label={t("home.quickActions")}
      data-bottom-action-bar
      data-edge-rail-item="workspace-actions"
    >
      <div className="floating-action-cluster" data-floating-action-cluster>
        {!dayPlanActive && (
          <button
            className="export-fab"
            data-edge-rail-item="export"
            type="button"
            onClick={exportToday}
            aria-label={t("home.exportCurrent", { date: compactDateLabel(selectedDate, locale, t) })}
          >
            <span className="export-rail-icon" aria-hidden="true">
              <img src="/ui/diary/export-stamp.png" alt="" />
            </span>
            <span className="export-fab-label">{t("home.exportTodayLabel")}</span>
          </button>
        )}
      </div>
      <div className="record-composer-bar" data-bottom-composer>
        <div className="composer-leading-slot" data-composer-leading>
          {!chatActive && (dayPlanActive ? (
            <button
              className="fab plan-add-fab"
              data-bottom-action="create"
              data-edge-rail-item="plan"
              data-workspace-create="plan"
              type="button"
              onClick={openPrimaryCreate}
              aria-label={t("plan.add")}
            >
              <img src="/ui/diary/plan-add-stamp.png" alt="" aria-hidden="true" />
            </button>
          ) : (
            <button
              className="fab complete-record-add"
              data-complete-action="create"
              data-workspace-create="diary"
              type="button"
              onClick={openPrimaryCreate}
              aria-label={t("home.completeRecord")}
            >
              <img src="/ui/diary/plan-add-stamp.png" alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
        <input
          ref={inputRef}
          className="persistent-quick-record-input"
          data-persistent-quick-record-input
          type="text"
          value={chatActive ? chatInput : content}
          onChange={(event) => (chatActive ? onChatInputChange(event.target.value) : setContent(event.target.value))}
          onKeyDown={(event) => {
            if (event.key !== "Enter") return;
            event.preventDefault();
            if (chatActive) onChatSend();
            else void submitQuickRecord();
          }}
          placeholder={chatActive ? t("agent.chatPlaceholder") : t("home.addRecordInline")}
          aria-label={chatActive ? t("agent.chatInput") : t("home.quickRecordInput")}
          autoComplete="off"
          disabled={chatActive ? chatBusy : saving}
        />
        <div className="composer-trailing-slot" data-composer-trailing>
          {chatActive ? <button className="chat-send-button" type="button" onClick={onChatSend} disabled={chatBusy || !chatInput.trim()} aria-label={t("agent.chatSend")}>{chatBusy ? "…" : "↑"}</button> : <QuickRecordButton onQuickRecord={submitQuickRecord} t={t} />}
        </div>
      </div>
    </div>
  );
}
