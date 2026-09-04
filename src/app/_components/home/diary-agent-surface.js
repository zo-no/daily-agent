"use client";

/**
 * @fileoverview Owns the Diary Agent's viewport presentation and status feedback.
 */

import { AgentAppearance } from "../../agent-appearance";

/** Keep the companion, its live status, and its transient empty-date note in one visual surface. */
export function DiaryAgentSurface({
  calendarOpen,
  documentHidden,
  emptyNote,
  hasEntries,
  label,
  motionMode,
  onActivate,
  onInteractionPausedChange,
  selectedDate,
  sessionStatus,
  summary,
  visualStatus
}) {
  return (
    <div
      className="organize-helper-slot diary-agent-viewport"
      data-agent-surface="diary"
      data-agent-stage-state={visualStatus}
      data-agent-status={visualStatus}
      data-agent-session-status={sessionStatus}
      data-agent-motion-mode={motionMode}
      data-agent-calendar-open={calendarOpen ? "true" : "false"}
      data-agent-document-hidden={documentHidden ? "true" : "false"}
      data-agent-empty-date={!hasEntries ? "true" : "false"}
      data-agent-speaking={summary || emptyNote ? "true" : "false"}
      data-agent-placement="viewport-spine"
    >
      <div className="diary-agent-traveler">
        {summary && (
          <p
            className="diary-agent-summary"
            data-agent-status={visualStatus}
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {summary}
          </p>
        )}
        <button
          className={`organize-helper${sessionStatus !== "idle" ? " is-awake" : ""}`}
          type="button"
          aria-label={label}
          aria-pressed={hasEntries ? sessionStatus !== "idle" : undefined}
          aria-expanded={!hasEntries ? Boolean(emptyNote) : undefined}
          data-date={selectedDate}
          data-agent-status={visualStatus}
          onBlur={() => onInteractionPausedChange(false)}
          onClick={onActivate}
          onFocus={() => onInteractionPausedChange(true)}
          onPointerCancel={(event) => onInteractionPausedChange(event.currentTarget === document.activeElement)}
          onPointerDown={() => onInteractionPausedChange(true)}
          onPointerUp={(event) => onInteractionPausedChange(event.currentTarget === document.activeElement)}
        >
          <AgentAppearance motionMode={motionMode} status={visualStatus} />
          <span className="visually-hidden">{label}</span>
        </button>
        {emptyNote && (
          <div className="diary-agent-empty-note" role="status" aria-live="polite">
            {emptyNote}
          </div>
        )}
      </div>
    </div>
  );
}
