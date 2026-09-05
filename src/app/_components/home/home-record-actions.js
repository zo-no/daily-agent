/**
 * @fileoverview 首页记录、计划和固定记录的持久化动作。
 */

import { fixedRecordEditorMode, fixedRecordSaveResult } from "@/lib/fixed-record-model.mjs";
import { localizeTemplate } from "@/lib/i18n.mjs";
import { normalizePlanBlock } from "@/lib/plan-model.mjs";
import { isValidRecordTime } from "@/lib/record-inline-edit-model.mjs";
import {
  localTime,
  makeId,
  markdownForDate,
  sanitizeTags
} from "@/lib/data.mjs";
import { downloadFile } from "../../download-file";

/** Creates the durable actions used by the home page without adding a second storage path. */
export function createHomeRecordActions({
  commitData,
  data,
  locale,
  periodicEntryMap,
  selectedDate,
  setToast,
  t,
  templateMap
}) {
  function saveInlineQuickRecord({ categoryId = "", content: rawContent, time }) {
    const content = String(rawContent || "").trim();
    if (!content || !isValidRecordTime(time)) return false;
    const defaultTemplate = data.templates.find((item) => item.id === "quick")
      || data.templates.find((item) => item.recordType !== "periodic");
    const resolvedCategoryId = data.categories.some((item) => item.id === categoryId)
      ? categoryId
      : defaultTemplate?.categoryId || data.categories[0]?.id || "";
    const template = data.templates.find((item) => item.categoryId === resolvedCategoryId && item.recordType !== "periodic")
      || defaultTemplate;
    const entry = {
      id: makeId("entry"),
      date: selectedDate,
      time,
      content,
      categoryId: resolvedCategoryId,
      tags: sanitizeTags(template?.tags || []),
      templateId: template?.id || null,
      fieldValues: {},
      attachments: [],
      createdAt: Date.now()
    };
    const saved = commitData((state) => ({ ...state, entries: [...state.entries, entry] }));
    if (saved) setToast(t("toast.recordAdded"));
    return saved;
  }

  function savePlanBlock(candidate) {
    const now = Date.now();
    let planBlock;
    try {
      planBlock = normalizePlanBlock({
        ...candidate,
        id: candidate.id || makeId("plan"),
        createdAt: candidate.createdAt || now,
        updatedAt: now
      });
    } catch (error) {
      console.error(error);
      setToast(t("toast.planSaveFailed"));
      return false;
    }
    const saved = commitData((state) => ({
      ...state,
      planBlocks: state.planBlocks.some((item) => item.id === planBlock.id)
        ? state.planBlocks.map((item) => item.id === planBlock.id ? planBlock : item)
        : [...state.planBlocks, planBlock]
    }));
    if (saved) setToast(candidate.id ? t("toast.planUpdated") : t("toast.planAdded"));
    return saved;
  }

  function deletePlanBlock(planBlock) {
    if (!window.confirm(t("confirm.deletePlan", { name: planBlock.title }))) return false;
    const deleted = commitData((state) => ({
      ...state,
      planBlocks: state.planBlocks.filter((item) => item.id !== planBlock.id)
    }));
    if (deleted) setToast(t("toast.planDeleted"));
    return deleted;
  }

  /** Applies one inline periodic edit through the same durable boundary as the composer. */
  function saveFixedInline(templateId, payload) {
    const template = templateMap.get(templateId);
    const displayTemplate = localizeTemplate(template, locale);
    const existing = periodicEntryMap.get(templateId);
    if (!template) return false;
    const mode = fixedRecordEditorMode(template, existing);
    if (payload.missingField) {
      setToast(t("toast.required", { field: payload.missingField.label }));
      return false;
    }
    const { content, fieldValues } = fixedRecordSaveResult(template, displayTemplate, existing, payload);

    if (existing && content === existing.content && JSON.stringify(fieldValues) === JSON.stringify(existing.fieldValues || {})) return true;

    if (!content.trim()) {
      if (!existing) {
        setToast(mode === "value" ? t("toast.fixedValueRequired") : t("toast.writeSomething"));
        return false;
      }
      if (!commitData((state) => ({ ...state, entries: state.entries.filter((entry) => entry.id !== existing.id) }))) return false;
      setToast(t("toast.emptyRecordDeleted"));
      return true;
    }

    const entry = {
      id: existing?.id || makeId("entry"),
      date: selectedDate,
      time: existing?.time || localTime(),
      content,
      categoryId: existing?.categoryId || template.categoryId,
      tags: existing?.tags || [...template.tags],
      templateId: template.id,
      fieldValues,
      createdAt: existing?.createdAt || Date.now()
    };
    if (!commitData((state) => ({
      ...state,
      entries: existing ? state.entries.map((item) => item.id === existing.id ? entry : item) : [...state.entries, entry]
    }))) return false;
    setToast(existing ? t("toast.recordUpdated") : t("toast.recordAdded"));
    return true;
  }

  function exportToday() {
    downloadFile(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8");
    setToast(t("toast.exported"));
  }

  return {
    deletePlanBlock,
    exportToday,
    saveFixedInline,
    saveInlineQuickRecord,
    savePlanBlock
  };
}
