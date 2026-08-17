"use client";

/**
 * @fileoverview 编辑本地计划时间块；外部日历事件未来通过同一表面显示来源与只读状态。
 */

import { useState } from "react";
import { timeToMinutes } from "@/lib/plan-model.mjs";
import { DialogSurface } from "./dialog-surface";
import { Icon } from "./ui";

/** Owns validation and submission for one local day-plan block. */
export function PlanEditor({ initialDraft, onClose, onDelete, onSave, t }) {
  const [draft, setDraft] = useState(initialDraft);
  const [error, setError] = useState("");
  const readOnly = draft.source === "google";

  function handleSubmit(event) {
    event.preventDefault();
    if (readOnly) {
      onClose();
      return;
    }
    const start = timeToMinutes(draft.startTime);
    const end = timeToMinutes(draft.endTime);
    if (!draft.title.trim()) {
      setError(t("plan.titleRequired"));
      return;
    }
    if (start === null || end === null || end <= start) {
      setError(t("plan.timeRangeInvalid"));
      return;
    }
    if (onSave({ ...draft, title: draft.title.trim(), updatedAt: Date.now() }) !== false) onClose();
  }

  return (
    <DialogSurface onClose={onClose} className="plan-editor" label={readOnly ? t("plan.details") : draft.id ? t("plan.edit") : t("plan.new")}>
      <form onSubmit={handleSubmit}>
        <div className="surface-header">
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
          <strong className="composer-title">{readOnly ? t("plan.details") : draft.id ? t("plan.edit") : t("plan.new")}</strong>
          <button className="save-button" type="submit">{t(readOnly ? "common.close" : "common.done")}</button>
        </div>
        <div className="plan-editor-fields">
          <label className="plan-title-field">
            <span>{t("plan.title")}</span>
            <input autoFocus={!readOnly} disabled={readOnly} value={draft.title} onChange={(event) => { setDraft({ ...draft, title: event.target.value }); setError(""); }} placeholder={t("plan.titlePlaceholder")} />
          </label>
          <label>
            <span>{t("common.date")}</span>
            <input type="date" disabled={readOnly} value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} />
          </label>
          {!draft.allDay && <div className="plan-time-fields">
            <label><span>{t("plan.starts")}</span><input type="time" disabled={readOnly} step="900" value={draft.startTime} onChange={(event) => { setDraft({ ...draft, startTime: event.target.value }); setError(""); }} /></label>
            <label><span>{t("plan.ends")}</span><input type="time" disabled={readOnly} step="900" value={draft.endTime} onChange={(event) => { setDraft({ ...draft, endTime: event.target.value }); setError(""); }} /></label>
          </div>}
          {!readOnly && <label>
            <span>{t("plan.flexibility")}</span>
            <select value={draft.flexibility} onChange={(event) => setDraft({ ...draft, flexibility: event.target.value })}>
              <option value="fixed">{t("plan.fixed")}</option>
              <option value="movable">{t("plan.movable")}</option>
              <option value="resizable">{t("plan.resizable")}</option>
            </select>
          </label>}
          <p className="plan-local-note">{t(readOnly ? "plan.googleReadOnly" : draft.externalRef?.provider === "google" ? "plan.syncedToGoogle" : "plan.syncPending")}</p>
          {error && <p className="plan-editor-error" role="alert">{error}</p>}
          {draft.id && draft.source !== "google" && (
            <button className="danger-button" type="button" onClick={() => onDelete(draft)}><Icon name="trash" />{t("plan.delete")}</button>
          )}
        </div>
      </form>
    </DialogSurface>
  );
}
