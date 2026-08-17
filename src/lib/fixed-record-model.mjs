/**
 * @fileoverview 固定记录的运行时填写适配，不迁移模板或历史正文。
 */

import { composeTemplateContent, fixedContentParts } from "./data.mjs";
import { localizeTemplate } from "./i18n.mjs";

const LEGACY_VALUE_TEMPLATE_IDS = new Set([
  "morning-weight",
  "evening-weight",
  "waist",
  "health-abnormal",
  "steps"
]);

const LEGACY_VALUE_LABELS = {
  "morning-weight": new Set(["晨重", "Morning weight"]),
  "evening-weight": new Set(["晚重", "Evening weight"]),
  waist: new Set(["腰围", "Waist"]),
  "health-abnormal": new Set(["异常", "Abnormality"]),
  steps: new Set(["日均步数", "Daily steps"])
};

function normalizeFieldValues(entry, template) {
  const fieldIds = new Set((template?.fields || []).map((field) => field.id));
  return Object.fromEntries(Object.entries(entry?.fieldValues || {}).filter(([fieldId]) => fieldIds.has(fieldId)));
}

function reversibleStructuredTemplate(template, entry) {
  if (!entry) return null;
  const fieldValues = normalizeFieldValues(entry, template);
  if (!Object.keys(fieldValues).length) return null;
  const content = String(entry.content || "").trim();
  return [template, localizeTemplate(template, "en"), localizeTemplate(template, "zh-CN")]
    .find((candidate) => composeTemplateContent(candidate, fieldValues).trim() === content) || null;
}

function isLegacyValueEntry(template, entry) {
  if (!LEGACY_VALUE_TEMPLATE_IDS.has(template?.id)) return false;
  if (!entry) return true;
  const { label, value } = fixedContentParts(entry.content);
  return Boolean(value && LEGACY_VALUE_LABELS[template.id]?.has(label));
}

function isReversibleStructuredEntry(template, entry) {
  if (!entry) return true;
  return Boolean(reversibleStructuredTemplate(template, entry));
}

export function fixedRecordEditorMode(template, entry) {
  if (template?.inputMode === "value") return "value";
  if (template?.inputMode === "free" && isLegacyValueEntry(template, entry)) return "value";
  if (template?.inputMode === "structured" && template.fields?.length && isReversibleStructuredEntry(template, entry)) return "structured";
  return "free";
}

export function fixedRecordDraft(template, entry) {
  const mode = fixedRecordEditorMode(template, entry);
  if (mode === "value") return { mode, value: fixedContentParts(entry?.content || "").value, content: "", fieldValues: {} };
  if (mode === "structured") return { mode, value: "", content: "", fieldValues: normalizeFieldValues(entry, template) };
  return { mode, value: "", content: String(entry?.content || template?.skeleton || ""), fieldValues: {} };
}

export function fixedRecordSaveResult(template, displayTemplate, entry, payload = {}) {
  const mode = fixedRecordEditorMode(template, entry);
  if (mode === "value") {
    const value = String(payload.value || "").trim();
    const originalLabel = fixedContentParts(entry?.content || "").label;
    const label = String(originalLabel || template?.name || "").trim();
    return { mode, content: value && label ? `${label}=${value}` : "", fieldValues: {} };
  }
  if (mode === "structured") {
    const fieldValues = {
      ...(entry?.fieldValues || {}),
      ...normalizeFieldValues({ fieldValues: payload.fieldValues || {} }, template)
    };
    const compositionTemplate = reversibleStructuredTemplate(template, entry) || displayTemplate;
    return { mode, content: composeTemplateContent(compositionTemplate, fieldValues).trim(), fieldValues };
  }
  return { mode, content: String(payload.content || ""), fieldValues: entry?.fieldValues ? { ...entry.fieldValues } : {} };
}
