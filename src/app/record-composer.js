"use client";

/**
 * @fileoverview 渲染记录编辑器并管理更多详情的展开状态。
 */

import { useEffect, useRef, useState } from "react";
import { localizeCategoryName } from "@/lib/i18n.mjs";
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
  const primaryInputRef = useRef(null);

  useEffect(() => {
    setDetailsOpen(false);
    const frame = window.requestAnimationFrame(() => primaryInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [activeTemplate, draft.createdAt, draft.id]);

  function handleSubmit(event) {
    if (onSave(event) === false) primaryInputRef.current?.focus();
  }

  return (
    <DialogSurface onClose={onClose} className="composer" label={draft.id ? t("composer.editTitle") : t("composer.addTitle")}>
      <form onSubmit={handleSubmit}>
        <div className="surface-header">
          <button className="icon-button" type="button" onClick={onClose} aria-label={t("common.close")}><Icon name="close" /></button>
          <strong className="composer-title">{draft.id ? t("common.edit") : t("common.record")}</strong>
          <button className="save-button" type="submit">{t("common.done")}</button>
        </div>

        {isPeriodicValueDraft ? (
          <div className="fixed-writing-area">
            <label><span>{t("common.template")}</span><input value={currentTemplateDisplay?.name || draft.fixedLabel || ""} readOnly /></label>
            <label><span>{t("composer.fixedValue")}</span><input ref={primaryInputRef} autoFocus value={draft.fixedValue || ""} onChange={(event) => onDraftChange({ ...draft, fixedValue: event.target.value })} placeholder={t("composer.fixedValuePlaceholder")} /></label>
            {draft.id && <p>{t("composer.fixedEmptyDeletes")}</p>}
          </div>
        ) : usesStructuredTemplate ? (
          <StructuredFields
            fields={currentTemplateDisplay.fields}
            values={draft.fieldValues}
            onChange={(fieldId, value) => onDraftChange((current) => ({
              ...current,
              fieldValues: { ...current.fieldValues, [fieldId]: value }
            }))}
          />
        ) : (
          <div className="writing-area">
            <textarea
              autoFocus
              ref={primaryInputRef}
              value={draft.content}
              onChange={(event) => onDraftChange({ ...draft, content: event.target.value })}
              placeholder={draft.id ? t("composer.placeholder") : currentTemplateDisplay?.prompt || t("composer.placeholder")}
              rows={7}
            />
          </div>
        )}

        <div className="composer-toolbar">
          {!draft.id && localizedTemplates.length ? (
            <label className="template-select">
              <Icon name="book" size={18} />
              <select aria-label={t("composer.useTemplate")} value={activeTemplate} onChange={(event) => onChooseTemplate(event.target.value)}>
                {localizedTemplates.map((template) => <option key={template.id} value={template.id}>{template.name}</option>)}
              </select>
              <Icon name="chevronRight" size={16} />
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
      </form>
    </DialogSurface>
  );
}
