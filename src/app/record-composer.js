"use client";

/**
 * @fileoverview 渲染记录编辑器并管理更多详情的展开状态。
 */

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { localizeCategoryName } from "@/lib/i18n.mjs";
import { markdownListEnterEdit } from "@/lib/markdown-list-input.mjs";
import {
  markdownSelectionBlockEdit,
  markdownSelectionBlockStyle,
  markdownSelectionFormatEdit,
  markdownSelectionFormatState
} from "@/lib/markdown-selection-format.mjs";
import { DialogSurface } from "./dialog-surface";
import { StructuredFields } from "./templates/structured-fields";
import { Icon } from "./ui";

/** Render the active record draft and reset details when the draft changes. */
export function RecordComposer({
  activeTemplate,
  categories,
  categoryMap,
  currentTemplateDisplay,
  draft,
  isPeriodicValueDraft,
  locale,
  localizedTemplates,
  onChooseTemplate,
  onClose,
  onDelete,
  onDraftChange,
  onSave,
  t,
  usesStructuredTemplate
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [writingSelection, setWritingSelection] = useState(null);
  const primaryInputRef = useRef(null);
  const formRef = useRef(null);
  const writingSelectionRef = useRef(null);
  const isComposingRef = useRef(false);

  useEffect(() => {
    setDetailsOpen(false);
    writingSelectionRef.current = null;
    setWritingSelection(null);
    const frame = window.requestAnimationFrame(() => primaryInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeTemplate, draft.createdAt, draft.id]);

  useEffect(() => {
    function handleSelectionChange() {
      const textarea = primaryInputRef.current;
      if (textarea?.tagName === "TEXTAREA" && document.activeElement === textarea) syncWritingSelection(textarea);
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  function handleSubmit(event) {
    const result = onSave(event);
    if (typeof result === "string") {
      formRef.current?.querySelector(`[data-field-id="${CSS.escape(result)}"]`)?.focus();
    } else if (result === false) primaryInputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  function handleWritingKeyDown(event) {
    if (event.key === "Escape" && event.currentTarget.selectionStart !== event.currentTarget.selectionEnd) {
      event.preventDefault();
      event.stopPropagation();
      event.nativeEvent?.stopImmediatePropagation?.();
      const collapseAt = event.currentTarget.selectionEnd;
      event.currentTarget.setSelectionRange(collapseAt, collapseAt);
      syncWritingSelection(event.currentTarget);
      return;
    }
    if (event.key !== "Enter" || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;

    const textarea = event.currentTarget;
    const edit = markdownListEnterEdit(textarea.value, textarea.selectionStart, textarea.selectionEnd);
    if (!edit) return;
    event.preventDefault();
    event.nativeEvent?.preventDefault?.();
    window.setTimeout(() => {
      if (!textarea.isConnected) return;
      textarea.setSelectionRange(edit.replaceStart, edit.replaceEnd);
      const inserted = document.execCommand?.("insertText", false, edit.replacement);
      if (!inserted) textarea.setRangeText(edit.replacement, edit.replaceStart, edit.replaceEnd, "end");
      const content = textarea.value;
      flushSync(() => onDraftChange((current) => ({ ...current, content })));
      textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd);
      syncWritingSelection(textarea);
    }, 0);
  }

  function syncWritingSelection(textarea) {
    if (isComposingRef.current || textarea.selectionStart === textarea.selectionEnd) {
      writingSelectionRef.current = null;
      setWritingSelection(null);
      return;
    }
    const next = {
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
      direction: textarea.selectionDirection || "none"
    };
    writingSelectionRef.current = next;
    setWritingSelection(next);
  }

  function handleWritingChange(event) {
    onDraftChange({ ...draft, content: event.target.value });
    syncWritingSelection(event.currentTarget);
  }

  function handleCompositionStart() {
    isComposingRef.current = true;
    writingSelectionRef.current = null;
    setWritingSelection(null);
  }

  function handleCompositionEnd(event) {
    const textarea = event.currentTarget;
    isComposingRef.current = false;
    window.requestAnimationFrame(() => textarea.isConnected && syncWritingSelection(textarea));
  }

  function handleFormatPointerDown() {
    const textarea = primaryInputRef.current;
    if (textarea?.tagName === "TEXTAREA" && textarea.selectionStart !== textarea.selectionEnd) {
      writingSelectionRef.current = {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
        direction: textarea.selectionDirection || "none"
      };
    }
  }

  function applySelectionFormat(kind) {
    const textarea = primaryInputRef.current;
    const selection = writingSelectionRef.current;
    if (!textarea || textarea.tagName !== "TEXTAREA" || !selection || isComposingRef.current) return;
    const edit = markdownSelectionFormatEdit(textarea.value, selection.start, selection.end, kind);
    if (!edit) return;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(edit.replaceStart, edit.replaceEnd, selection.direction);
    const inserted = document.execCommand?.("insertText", false, edit.replacement);
    if (!inserted) textarea.setRangeText(edit.replacement, edit.replaceStart, edit.replaceEnd, "select");
    const content = textarea.value;
    flushSync(() => onDraftChange((current) => ({ ...current, content })));
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd, selection.direction);
    syncWritingSelection(textarea);
  }

  function applyBlockStyle(style) {
    const textarea = primaryInputRef.current;
    const selection = writingSelectionRef.current;
    if (!textarea || textarea.tagName !== "TEXTAREA" || !selection || isComposingRef.current) return;
    const edit = markdownSelectionBlockEdit(textarea.value, selection.start, selection.end, style);
    if (!edit) {
      textarea.focus({ preventScroll: true });
      textarea.setSelectionRange(selection.start, selection.end, selection.direction);
      return;
    }
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(edit.replaceStart, edit.replaceEnd, selection.direction);
    const inserted = document.execCommand?.("insertText", false, edit.replacement);
    if (!inserted) textarea.setRangeText(edit.replacement, edit.replaceStart, edit.replaceEnd, "select");
    const content = textarea.value;
    flushSync(() => onDraftChange((current) => ({ ...current, content })));
    textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd, selection.direction);
    syncWritingSelection(textarea);
  }

  const hasWritingSelection = Boolean(writingSelection && writingSelection.start !== writingSelection.end);
  const boldActive = hasWritingSelection && markdownSelectionFormatState(draft.content, writingSelection.start, writingSelection.end, "bold");
  const italicActive = hasWritingSelection && markdownSelectionFormatState(draft.content, writingSelection.start, writingSelection.end, "italic");
  const blockStyle = hasWritingSelection ? markdownSelectionBlockStyle(draft.content, writingSelection.start, writingSelection.end) : "body";

  return (
    <DialogSurface onClose={onClose} className="composer" label={draft.id ? t("composer.editTitle") : t("composer.addTitle")}>
      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="surface-header">
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
          <strong className="composer-title">{draft.id ? t("common.edit") : t("common.record")}</strong>
          <button className="save-button" type="submit">{t("common.done")}</button>
        </div>

        {isPeriodicValueDraft ? (
          <div className="fixed-writing-area">
            <label><span>{t("common.template")}</span><input value={currentTemplateDisplay?.name || draft.fixedLabel || ""} readOnly /></label>
            <label><span>{t("composer.fixedValue")}</span><input ref={primaryInputRef} autoFocus value={draft.fixedValue || ""} onChange={(event) => onDraftChange({ ...draft, fixedValue: event.target.value })} placeholder={currentTemplateDisplay?.prompt || t("composer.fixedValuePlaceholder")} /></label>
            {currentTemplateDisplay?.prompt && <p className="composer-guidance">{currentTemplateDisplay.prompt}</p>}
            {draft.id && <p>{t("composer.fixedEmptyDeletes")}</p>}
          </div>
        ) : usesStructuredTemplate ? (
          <div className="structured-writing-area">
            {currentTemplateDisplay?.prompt && <p className="composer-guidance">{currentTemplateDisplay.prompt}</p>}
            <StructuredFields
              fields={currentTemplateDisplay.fields}
              values={draft.fieldValues}
              onChange={(fieldId, value) => onDraftChange((current) => ({
                ...current,
                fieldValues: { ...current.fieldValues, [fieldId]: value }
              }))}
            />
          </div>
        ) : (
          <div className="writing-area">
            <textarea
              autoFocus
              ref={primaryInputRef}
              value={draft.content}
              onChange={handleWritingChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleWritingKeyDown}
              onSelect={(event) => syncWritingSelection(event.currentTarget)}
              placeholder={draft.id ? t("composer.placeholder") : currentTemplateDisplay?.prompt || t("composer.placeholder")}
              rows={7}
            />
          </div>
        )}

        <div className="composer-toolbar">
          {hasWritingSelection ? (
            <div className="selection-format-actions" data-rich-text-toolbar>
              <button type="button" aria-label={t("composer.bold")} aria-pressed={boldActive} onPointerDown={handleFormatPointerDown} onMouseDown={(event) => event.preventDefault()} onClick={() => applySelectionFormat("bold")}><strong aria-hidden="true">B</strong><span>{t("composer.bold")}</span></button>
              <button type="button" aria-label={t("composer.italic")} aria-pressed={italicActive} onPointerDown={handleFormatPointerDown} onMouseDown={(event) => event.preventDefault()} onClick={() => applySelectionFormat("italic")}><em aria-hidden="true">I</em><span>{t("composer.italic")}</span></button>
              <select className="selection-block-style" aria-label={t("composer.textStyle")} value={blockStyle} onPointerDown={handleFormatPointerDown} onChange={(event) => applyBlockStyle(event.target.value)}>
                {blockStyle === "mixed" && <option value="mixed" disabled>{t("composer.mixedStyle")}</option>}
                <option value="body">{t("composer.body")}</option>
                <option value="title">{t("composer.title")}</option>
                <option value="subtitle">{t("composer.subtitle")}</option>
              </select>
            </div>
          ) : !draft.id && localizedTemplates.length ? (
            <label className="template-select">
              <Icon name="book" size={18} />
              <select aria-label={t("composer.useTemplate")} value={activeTemplate} onChange={(event) => onChooseTemplate(event.target.value)}>
                {localizedTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <Icon name="chevronRight" size={16} />
              <small>{currentTemplateDisplay?.inputMode === "structured" ? t("composer.formTemplate") : currentTemplateDisplay?.inputMode === "value" ? t("composer.valueTemplate") : t("composer.freeTemplate")}</small>
            </label>
          ) : <span className="entry-category-label">{localizeCategoryName(categoryMap.get(draft.categoryId), locale)}</span>}
          <button className={`details-toggle ${detailsOpen ? "active" : ""}`} type="button" onClick={() => setDetailsOpen((value) => !value)}>
            <Icon name="more" />{t("common.more")}
          </button>
        </div>

        {detailsOpen && (
          <div className="composer-details">
            <div className="time-fields">
              <label><span>{t("common.date")}</span><input aria-label={t("common.date")} type="date" value={draft.date} onChange={(event) => onDraftChange({ ...draft, date: event.target.value })} /></label>
              <label><span>{t("common.time")}</span><input aria-label={t("common.time")} type="time" value={draft.time} onChange={(event) => onDraftChange({ ...draft, time: event.target.value })} /></label>
            </div>
            <label><span>{t("common.category")}</span><select value={draft.categoryId} onChange={(event) => onDraftChange({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{localizeCategoryName(category, locale)}</option>)}</select></label>
            <label><span>{t("common.tags")}</span><input value={draft.tags.join(" ")} onChange={(event) => onDraftChange({ ...draft, tags: event.target.value.split(/[，,\s]+/) })} placeholder={t("composer.tagPlaceholder")} /></label>
            {draft.id && <button className="danger-button" type="button" onClick={onDelete}><Icon name="trash" />{t("composer.delete")}</button>}
          </div>
        )}
        <span className="composer-shortcut" aria-hidden="true">{t("composer.saveShortcut")}</span>
      </form>
    </DialogSurface>
  );
}
