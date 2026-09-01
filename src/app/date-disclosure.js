"use client";

/** Shared diary-style date identity used by date-driven workspaces. */

import { diaryDateLabel, fullDateLabel, weekdayLabel } from "./date-label";
import { Icon } from "./ui";

function DateIdentityContent({ locale, selectedDate }) {
  return (
    <span className="date-context-primary">
      <span className="date-context-date">{diaryDateLabel(selectedDate, locale)}</span>
      <span className="date-context-separator" aria-hidden="true">·</span>
      <span className="date-context-weekday">{weekdayLabel(selectedDate, locale)}</span>
    </span>
  );
}

export function DateDisclosure({
  className = "",
  as: Heading = "h2",
  expanded,
  locale,
  selectedDate,
  triggerRef,
  onToggle,
  openLabel,
  closeLabel
}) {
  return (
    <Heading
      className={`date-context-title${expanded ? " is-expanded" : ""}${className ? ` ${className}` : ""}`}
      aria-label={fullDateLabel(selectedDate, locale)}
      aria-live="polite"
    >
      <button
        className="date-context-disclosure"
        type="button"
        ref={triggerRef}
        aria-label={expanded ? closeLabel : openLabel}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="date-context-disclosure-content">
          <DateIdentityContent locale={locale} selectedDate={selectedDate} />
          <span className="date-context-disclosure-icon"><Icon name="chevronDown" size={18} /></span>
        </span>
      </button>
    </Heading>
  );
}
