"use client";

/**
 * @fileoverview 渲染记录编辑器并管理更多详情的展开状态。
 */

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import {
  CONTENT_IMPROVEMENT_SCHEMA_VERSION,
  MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS,
  contentImprovementFingerprint
} from "@/modules/composer/content-improvement/model.mjs";
import { localizeCategoryName } from "@/lib/i18n.mjs";
import { markdownListEnterEdit } from "@/lib/markdown-list-input.mjs";
import {
  markdownSelectionBlockEdit,
  markdownSelectionBlockStyle,
  markdownSelectionFormatEdit,
  markdownSelectionFormatState
} from "@/lib/markdown-selection-format.mjs";
import { DialogSurface } from "./dialog-surface";
import { AttachmentImage } from "./attachment-image";
import { StructuredFields } from "./_components/recording";
import { Icon } from "./ui";
import { formatAttachmentBytes } from "@/lib/attachment-model.mjs";
import { AgentAppearance } from "./agent-appearance";

const IDLE_IMPROVEMENT = Object.freeze({
  status: "idle",
  sourceContent: "",
  improvedContent: "",
  view: "candidate",
  notice: ""
});

function ComposerSurface({ children, inline, label, onClose }) {
  if (inline) {
    return (
      <section className="composer inline-record-editor" data-inline-record-editor aria-label={label}>
        {children}
      </section>
    );
  }
  return <DialogSurface onClose={onClose} className="composer" label={label}>{children}</DialogSurface>;
}

function opaqueComposerToken(prefix) {
  const random = globalThis.crypto?.randomUUID?.().replaceAll("-", "")
    || `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
  return `${prefix}_${random}`.slice(0, 128);
}

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
  onAddAttachment,
  onRemoveAttachment,
  onDraftChange,
  onSave,
  attachmentBusy,
  accountGeneration,
  contentImprovementProvider,
  inline = false,
  t,
  usesStructuredTemplate
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [writingSelection, setWritingSelection] = useState(null);
  const [improvement, setImprovement] = useState(IDLE_IMPROVEMENT);
  const primaryInputRef = useRef(null);
  const formRef = useRef(null);
  const attachmentInputRef = useRef(null);
  const writingSelectionRef = useRef(null);
  const isComposingRef = useRef(false);
  const improvementAbortRef = useRef(null);
  const improvementRequestRef = useRef(null);
  const improvementTargetRef = useRef(opaqueComposerToken("composer"));
  const latestImprovementContextRef = useRef(null);

  latestImprovementContextRef.current = {
    accountGeneration,
    content: draft.content,
    target: improvementTargetRef.current
  };

  useEffect(() => {
    improvementAbortRef.current?.abort();
    improvementAbortRef.current = null;
    improvementRequestRef.current = null;
    const target = opaqueComposerToken("composer");
    improvementTargetRef.current = target;
    latestImprovementContextRef.current = {
      accountGeneration,
      content: draft.content,
      target
    };
    setImprovement(IDLE_IMPROVEMENT);
    setDetailsOpen(false);
    writingSelectionRef.current = null;
    setWritingSelection(null);
    const frame = window.requestAnimationFrame(() => primaryInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [accountGeneration, activeTemplate, draft.createdAt, draft.id]);

  useEffect(() => () => improvementAbortRef.current?.abort(), []);

  useEffect(() => {
    if (improvement.status === "idle" || improvement.sourceContent === draft.content) return;
    improvementAbortRef.current?.abort();
    improvementAbortRef.current = null;
    improvementRequestRef.current = null;
    setImprovement(IDLE_IMPROVEMENT);
  }, [draft.content, improvement.sourceContent, improvement.status]);

  useEffect(() => {
    function handleSelectionChange() {
      const textarea = primaryInputRef.current;
      if (textarea?.tagName === "TEXTAREA" && document.activeElement === textarea) syncWritingSelection(textarea);
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  async function handleSubmit(event) {
    if (attachmentBusy || improvement.status !== "idle") {
      event.preventDefault();
      return;
    }
    const result = await onSave(event);
    if (typeof result === "string") {
      formRef.current?.querySelector(`[data-field-id="${CSS.escape(result)}"]`)?.focus();
    } else if (result === false) primaryInputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && improvement.status !== "idle") {
      event.preventDefault();
      event.stopPropagation();
      cancelImprovement();
      return;
    }
    if (event.key === "Escape" && inline) {
      event.preventDefault();
      event.stopPropagation();
      closeComposer();
      return;
    }
    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
      event.preventDefault();
      formRef.current?.requestSubmit();
    }
  }

  /** Keeps Markdown list continuation and selection handling inside the free-text editor. */
  function handleWritingKeyDown(event) {
    if (event.currentTarget.readOnly) return;
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
    if (improvement.status === "pending") cancelImprovement({ focus: false });
    else if (improvement.notice) setImprovement(IDLE_IMPROVEMENT);
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
  const improvementBusy = improvement.status === "pending";
  const improvementReviewing = improvement.status === "candidate";
  const improvementActive = improvementBusy || improvementReviewing;
  const displayedContent = improvementReviewing
    ? improvement.view === "original" ? improvement.sourceContent : improvement.improvedContent
    : draft.content;
  const improvementUnchanged = improvementReviewing
    && improvement.improvedContent === improvement.sourceContent;

  function cancelImprovement({ focus = true } = {}) {
    improvementAbortRef.current?.abort();
    improvementAbortRef.current = null;
    improvementRequestRef.current = null;
    setImprovement(IDLE_IMPROVEMENT);
    if (focus) window.requestAnimationFrame(() => primaryInputRef.current?.focus());
  }

  function closeComposer() {
    improvementAbortRef.current?.abort();
    improvementAbortRef.current = null;
    improvementRequestRef.current = null;
    if (!attachmentBusy) onClose();
  }

  async function requestContentImprovement() {
    if (improvement.status !== "idle") return;
    const sourceContent = draft.content;
    if (!sourceContent.trim()) {
      setImprovement({ ...IDLE_IMPROVEMENT, notice: t("composer.improveWriteFirst") });
      primaryInputRef.current?.focus();
      return;
    }
    if (sourceContent.length > MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS) {
      setImprovement({
        ...IDLE_IMPROVEMENT,
        notice: t("composer.improveTooLong", { count: MAX_CONTENT_IMPROVEMENT_SOURCE_CHARS })
      });
      primaryInputRef.current?.focus();
      return;
    }
    const controller = new AbortController();
    const request = {
      schemaVersion: CONTENT_IMPROVEMENT_SCHEMA_VERSION,
      requestId: opaqueComposerToken("improve"),
      target: improvementTargetRef.current,
      sourceFingerprint: contentImprovementFingerprint(sourceContent),
      locale,
      content: sourceContent,
      signal: controller.signal
    };
    improvementAbortRef.current?.abort();
    improvementAbortRef.current = controller;
    improvementRequestRef.current = request;
    writingSelectionRef.current = null;
    setWritingSelection(null);
    setDetailsOpen(false);
    setImprovement({
      ...IDLE_IMPROVEMENT,
      status: "pending",
      sourceContent,
      notice: t("composer.improveWorking")
    });
    try {
      if (!contentImprovementProvider?.improve) {
        throw Object.assign(new Error("Content improvement is unavailable."), { code: "unavailable" });
      }
      const proposal = await contentImprovementProvider.improve(request);
      const currentRequest = improvementRequestRef.current;
      const context = latestImprovementContextRef.current;
      if (currentRequest?.requestId !== request.requestId
        || context?.accountGeneration !== accountGeneration
        || context?.target !== request.target
        || context?.content !== sourceContent) return;
      if (!proposal
        || proposal.schemaVersion !== request.schemaVersion
        || proposal.requestId !== request.requestId
        || proposal.target !== request.target
        || proposal.sourceFingerprint !== request.sourceFingerprint) {
        improvementAbortRef.current = null;
        improvementRequestRef.current = null;
        setImprovement({ ...IDLE_IMPROVEMENT, notice: t("composer.improveUnavailable") });
        return;
      }
      improvementAbortRef.current = null;
      improvementRequestRef.current = null;
      setImprovement({
        status: "candidate",
        sourceContent,
        improvedContent: proposal.improvedContent,
        view: "candidate",
        notice: proposal.improvedContent === sourceContent
          ? t("composer.improveUnchanged")
          : t("composer.improveReady")
      });
      window.requestAnimationFrame(() => primaryInputRef.current?.focus());
    } catch (error) {
      if (controller.signal.aborted || improvementRequestRef.current?.requestId !== request.requestId) return;
      improvementAbortRef.current = null;
      improvementRequestRef.current = null;
      setImprovement({
        ...IDLE_IMPROVEMENT,
        notice: error?.code === "rate-limited"
          ? t("composer.improveRateLimited")
          : error?.code === "timeout"
            ? t("composer.improveTimeout")
            : t("composer.improveUnavailable")
      });
      window.requestAnimationFrame(() => primaryInputRef.current?.focus());
    }
  }

  function useImprovedDraft() {
    if (!improvementReviewing || improvementUnchanged) return;
    const content = improvement.improvedContent;
    setImprovement(IDLE_IMPROVEMENT);
    onDraftChange((current) => ({ ...current, content }));
    window.requestAnimationFrame(() => primaryInputRef.current?.focus());
  }

  return (
    <ComposerSurface inline={inline} onClose={closeComposer} label={draft.id ? t("composer.editTitle") : t("composer.addTitle")}>
      <form ref={formRef} onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        <div className="surface-header">
          <button className={inline ? "inline-record-cancel" : "icon-button"} type="button" disabled={attachmentBusy} onClick={closeComposer} aria-label={inline ? undefined : t("common.close")}>
            {inline ? t("common.cancel") : <Icon name="close" />}
          </button>
          <strong className="composer-title">{draft.id ? t("common.edit") : t("common.record")}</strong>
          <button className="save-button" type="submit" disabled={attachmentBusy || improvementActive}>{t("common.done")}</button>
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
          <div
            className="writing-area"
            data-content-improvement-status={improvement.status}
            data-content-improvement-view={improvementReviewing ? improvement.view : undefined}
          >
            <textarea
              autoFocus
              ref={primaryInputRef}
              value={displayedContent}
              readOnly={improvementReviewing}
              onChange={handleWritingChange}
              onCompositionStart={handleCompositionStart}
              onCompositionEnd={handleCompositionEnd}
              onKeyDown={handleWritingKeyDown}
              onSelect={(event) => { if (!improvementActive) syncWritingSelection(event.currentTarget); }}
              placeholder={draft.id ? t("composer.placeholder") : currentTemplateDisplay?.prompt || t("composer.placeholder")}
              rows={7}
            />
            <button
              className="composer-agent-hero"
              type="button"
              onClick={requestContentImprovement}
              disabled={improvementActive}
              aria-label={improvementBusy
                ? t("composer.improveWorking")
                : improvementReviewing
                  ? t("composer.improveReady")
                  : t("composer.improve")}
              data-content-improvement-trigger
            >
              <AgentAppearance status={improvementBusy ? "scanning" : improvementReviewing ? "complete" : "idle"} />
              <span>{improvementBusy
                ? t("composer.improveWorking")
                : improvementReviewing
                  ? t("composer.improveReadyShort")
                  : t("composer.improveShort")}</span>
            </button>
            {improvementReviewing && (
              <div className="content-improvement-actions" role="group" aria-label={t("composer.improveReviewActions")}>
                <button type="button" onClick={() => setImprovement((current) => ({
                  ...current,
                  view: current.view === "candidate" ? "original" : "candidate"
                }))}>
                  {improvement.view === "candidate" ? t("composer.viewOriginal") : t("composer.viewImproved")}
                </button>
                <button type="button" className="use-improved" disabled={improvementUnchanged} onClick={useImprovedDraft}>
                  {t("composer.useImproved")}
                </button>
                <button type="button" onClick={() => cancelImprovement()}>{t("composer.cancelImprovement")}</button>
              </div>
            )}
            {improvement.notice && (
              <p className="content-improvement-status" role="status" aria-live="polite">{improvement.notice}</p>
            )}
          </div>
        )}

        <div className="composer-toolbar">
          {!improvementActive && hasWritingSelection ? (
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
              <select disabled={improvementActive} aria-label={t("composer.useTemplate")} value={activeTemplate} onChange={(event) => onChooseTemplate(event.target.value)}>
                {localizedTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <Icon name="chevronRight" size={16} />
              <small>{currentTemplateDisplay?.inputMode === "structured" ? t("composer.formTemplate") : currentTemplateDisplay?.inputMode === "value" ? t("composer.valueTemplate") : t("composer.freeTemplate")}</small>
            </label>
          ) : <span className="entry-category-label">{localizeCategoryName(categoryMap.get(draft.categoryId), locale)}</span>}
          <button
            className={`details-toggle ${detailsOpen ? "active" : ""}`}
            type="button"
            disabled={improvementActive}
            aria-expanded={detailsOpen}
            aria-controls="record-composer-details"
            onClick={() => setDetailsOpen((value) => !value)}
          >
            <Icon name="more" />{t("common.more")}
          </button>
        </div>

        <div id="record-composer-details" className="composer-details" hidden={!detailsOpen}>
            <div className="composer-detail-fields">
              <div className="time-fields">
                <label><span>{t("common.date")}</span><input aria-label={t("common.date")} type="date" value={draft.date} onChange={(event) => onDraftChange({ ...draft, date: event.target.value })} /></label>
                {!inline && <label><span>{t("common.time")}</span><input aria-label={t("common.time")} type="time" value={draft.time} onChange={(event) => onDraftChange({ ...draft, time: event.target.value })} /></label>}
              </div>
              <label><span>{t("common.category")}</span><select value={draft.categoryId} onChange={(event) => onDraftChange({ ...draft, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{localizeCategoryName(category, locale)}</option>)}</select></label>
              <label><span>{t("common.tags")}</span><input value={draft.tags.join(" ")} onChange={(event) => onDraftChange({ ...draft, tags: event.target.value.split(/[，,\s]+/) })} placeholder={t("composer.tagPlaceholder")} /></label>
            </div>
            {!usesStructuredTemplate && !isPeriodicValueDraft && (
              <div className="composer-attachments">
                <div className="composer-attachments-heading">
                  <span>{t("attachments.title")}</span>
                  <button className="attachment-picker-button" type="button" disabled={attachmentBusy || draft.attachments?.length >= 1} onClick={() => attachmentInputRef.current?.click()}><Icon name="image" size={18} />{attachmentBusy ? t("attachments.saving") : draft.attachments?.length ? t("attachments.limitReached") : t("attachments.add")}</button>
                </div>
                <input ref={attachmentInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) onAddAttachment(file);
                }} />
                {(draft.attachments || []).map((attachment) => (
                  <div className="composer-attachment-item" key={attachment.id}>
                    <AttachmentImage attachment={attachment} compact t={t} />
                    <span className="composer-attachment-copy"><strong>{attachment.name}</strong><small>{formatAttachmentBytes(attachment.bytes)}</small></span>
                    <button className="attachment-remove-button" type="button" disabled={attachmentBusy} onClick={() => onRemoveAttachment(attachment)} aria-label={t("attachments.remove", { name: attachment.name })}><Icon name="trash" size={18} /></button>
                  </div>
                ))}
                <p className="composer-guidance">{t("attachments.localHint")}</p>
              </div>
            )}
            {draft.id && (
              <div className="composer-danger-footer">
                <button className="danger-button" type="button" disabled={attachmentBusy} onClick={onDelete}><Icon name="trash" />{t("composer.delete")}</button>
              </div>
            )}
        </div>
        <span className="composer-shortcut" aria-hidden="true">{t("composer.saveShortcut")}</span>
      </form>
    </ComposerSurface>
  );
}
