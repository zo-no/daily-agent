"use client";

/**
 * @fileoverview Provides one non-modal, time-only editor anchored to an ordinary record row.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { isValidRecordTime } from "@/lib/record-inline-edit-model.mjs";

export function RecordTimeEditor({ entry, onClose, onSave, t }) {
  const [time, setTime] = useState(entry.time || "");
  const [invalid, setInvalid] = useState(false);
  const surfaceRef = useRef(null);
  const inputRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const closeAndRestore = useCallback(() => {
    const trigger = document.querySelector(`[data-entry-time-action][data-entry-id="${CSS.escape(entry.id)}"]`);
    onCloseRef.current();
    window.requestAnimationFrame(() => trigger?.isConnected && trigger.focus({ preventScroll: true }));
  }, [entry.id]);

  useEffect(() => {
    const trigger = document.querySelector(`[data-entry-time-action][data-entry-id="${CSS.escape(entry.id)}"]`);
    const handlePointerDown = (event) => {
      if (surfaceRef.current?.contains(event.target) || event.target === trigger) return;
      if (event.target.closest?.("[data-entry-time-action], [data-entry-content-action]")) {
        onCloseRef.current();
        return;
      }
      closeAndRestore();
    };
    const handleKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      closeAndRestore();
    };

    inputRef.current?.focus({ preventScroll: true });
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [closeAndRestore, entry.id]);

  function submit(event) {
    event.preventDefault();
    if (!isValidRecordTime(time)) {
      setInvalid(true);
      inputRef.current?.focus();
      return;
    }
    if (onSave(entry.id, time)) closeAndRestore();
  }

  return (
    <div
      ref={surfaceRef}
      className="record-time-editor"
      data-record-time-editor
      role="dialog"
      aria-label={t("entry.timeEditorTitle")}
    >
      <form onSubmit={submit}>
        <label>
          <span>{t("common.time")}</span>
          <input
            ref={inputRef}
            type="time"
            value={time}
            aria-invalid={invalid || undefined}
            onChange={(event) => {
              setTime(event.target.value);
              setInvalid(false);
            }}
          />
        </label>
        {invalid && <p role="alert">{t("entry.timeInvalid")}</p>}
        <div className="record-time-editor-actions">
          <button type="button" onClick={closeAndRestore}>{t("common.cancel")}</button>
          <button type="submit">{t("common.done")}</button>
        </div>
      </form>
    </div>
  );
}
