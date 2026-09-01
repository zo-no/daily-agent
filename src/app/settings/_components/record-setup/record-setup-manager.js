"use client";

/**
 * @fileoverview 编排设置页中的领域、分类与记录方式管理。
 */

import { useEffect, useRef, useState } from "react";
import { hasTemplateContent, makeId, sanitizeTags } from "@/lib/data.mjs";
import { localizeCategoryName, localizeDomainName } from "@/lib/i18n.mjs";
import { moveOrderedItemBy, moveStructureItem, moveTemplateField } from "@/lib/structure-order.mjs";
import { useI18n } from "../../../i18n";
import { useLogNoteData, useToast } from "../../../use-log-note-data";
import { RecordSetupScreen } from "./record-setup-screen";

function nextOrder(items) {
  return items.length ? Math.max(...items.map((item) => Number(item.order) || 0)) + 1 : 0;
}

/** 组织结构管理的数据操作，并将渲染委托给 RecordSetupScreen。 */
export function RecordSetupManager({ embedded = false, focusPeriodic: focusPeriodicProp }) {
  const { locale, t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(embedded ? null : setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [focusPeriodic, setFocusPeriodic] = useState(Boolean(focusPeriodicProp));
  const [selection, setSelection] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const emptyTemplatesCleanedRef = useRef(false);

  useEffect(() => {
    if (typeof focusPeriodicProp === "boolean") {
      setFocusPeriodic(focusPeriodicProp);
      return;
    }
    setFocusPeriodic(new URLSearchParams(window.location.search).get("focus") === "periodic");
  }, [focusPeriodicProp]);

  useEffect(() => {
    if (!hydrated || emptyTemplatesCleanedRef.current) return;
    emptyTemplatesCleanedRef.current = true;
    commitData((state) => {
      const templates = state.templates.filter(hasTemplateContent);
      return templates.length === state.templates.length ? state : { ...state, templates };
    });
  }, [commitData, hydrated]);

  const selectedDomain = selection?.type === "domain" ? data.domains.find((item) => item.id === selection.id) : null;
  const selectedCategory = selection?.type === "category" ? data.categories.find((item) => item.id === selection.id) : null;
  const selectedTemplate = selection?.type === "template" ? data.templates.find((item) => item.id === selection.id) : null;

  function select(type, id) {
    setSelection({ type, id });
    setFocusTarget(null);
  }

  function createDomain() {
    const id = makeId("domain");
    if (!commitData((state) => ({ ...state, domains: [...state.domains, { id, name: t("templates.untitledDomain"), order: nextOrder(state.domains) }] }))) return;
    setSelection({ type: "domain", id });
    setFocusTarget({ type: "domain", id });
  }

  function createCategory(domainId) {
    const id = makeId("category");
    if (!commitData((state) => ({
      ...state,
      categories: [...state.categories, {
        id, domainId: domainId || state.domains[0]?.id || "", name: t("templates.untitledCategory"),
        order: nextOrder(state.categories.filter((item) => item.domainId === domainId))
      }]
    }))) return;
    setSelection({ type: "category", id });
    setFocusTarget({ type: "category", id });
  }

  /** Creates one template preset in the selected category and opens it for editing. */
  function createTemplate(categoryId, preset = "free") {
    const id = makeId("template");
    const presets = {
      free: {
        name: t("templates.presetQuickName"), recordType: "linear", schedule: null, inputMode: "free",
        prompt: t("templates.presetQuickPrompt"), skeleton: "", fields: []
      },
      structured: {
        name: t("templates.presetReflectionName"), recordType: "linear", schedule: null, inputMode: "structured",
        prompt: t("templates.presetReflectionPrompt"), skeleton: "", fields: [
          { id: makeId("field"), label: t("templates.presetObservation"), type: "textarea", options: [], placeholder: t("templates.presetObservationHint"), required: true },
          { id: makeId("field"), label: t("templates.presetNextStep"), type: "text", options: [], placeholder: t("templates.presetNextStepHint"), required: false }
        ]
      },
      value: {
        name: t("templates.presetValueName"), recordType: "periodic", schedule: { cadence: "daily" }, inputMode: "value",
        homeVisible: true, prompt: t("templates.presetValuePrompt"), skeleton: "", fields: []
      }
    };
    const initial = presets[preset] || presets.free;
    if (!commitData((state) => ({
      ...state,
      templates: [...state.templates, {
        id, ...initial, categoryId: categoryId || state.categories[0]?.id || "",
        order: nextOrder(state.templates.filter((item) => item.categoryId === categoryId)),
        tags: []
      }]
    }))) return;
    setSelection({ type: "template", id });
    setFocusTarget({ type: "template", id });
  }

  function duplicateTemplate() {
    if (!selectedTemplate) return;
    const id = makeId("template");
    if (!commitData((state) => ({
      ...state,
      templates: [...state.templates, {
        ...selectedTemplate,
        id,
        name: t("templates.copyName", { name: selectedTemplate.name }),
        order: nextOrder(state.templates.filter((item) => item.categoryId === selectedTemplate.categoryId)),
        schedule: selectedTemplate.schedule ? { ...selectedTemplate.schedule } : null,
        tags: [...selectedTemplate.tags],
        fields: selectedTemplate.fields.map((field) => ({ ...field, id: makeId("field"), options: [...field.options] }))
      }]
    }))) return;
    setSelection({ type: "template", id });
    setFocusTarget({ type: "template", id });
    setToast(t("toast.templateDuplicated"));
  }

  function closeEditor() {
    if (selectedTemplate && !hasTemplateContent(selectedTemplate)) {
      if (!commitData((state) => ({ ...state, templates: state.templates.filter((item) => item.id !== selectedTemplate.id) }))) return;
    }
    setSelection(null);
    setFocusTarget(null);
  }

  function updateSelected(patch) {
    if (!selection) return false;
    const key = `${selection.type}s`;
    return commitData((state) => ({ ...state, [key]: state[key].map((item) => item.id === selection.id ? { ...item, ...patch } : item) }));
  }

  function normalizeName() {
    if (selectedDomain && !selectedDomain.name.trim()) updateSelected({ name: t("templates.untitledDomain") });
    if (selectedCategory && !selectedCategory.name.trim()) updateSelected({ name: t("templates.untitledCategory") });
    if (selectedTemplate && !selectedTemplate.name.trim()) updateSelected({ name: t("templates.untitled") });
  }

  function updateTemplate(patch) {
    if (patch.recordType === "linear") patch.schedule = null;
    if (patch.recordType === "periodic" && !selectedTemplate.schedule) patch.schedule = { cadence: "daily" };
    updateSelected(patch);
  }

  function setInputMode(inputMode) {
    if (!selectedTemplate) return;
    const patch = { inputMode };
    if (inputMode === "structured" && !selectedTemplate.fields.length) patch.fields = [{
      id: makeId("field"), label: t("templates.contentField"), type: "textarea", options: [],
      placeholder: t("templates.contentPlaceholder"), required: true
    }];
    updateTemplate(patch);
  }

  function addField() {
    updateTemplate({ inputMode: "structured", fields: [...selectedTemplate.fields, {
      id: makeId("field"), label: t("templates.newField"), type: "text", options: [], placeholder: "", required: false
    }] });
  }

  function updateField(id, patch) {
    updateTemplate({ fields: selectedTemplate.fields.map((item) => item.id === id ? { ...item, ...patch } : item) });
  }

  function deleteField(id) {
    updateTemplate({ fields: selectedTemplate.fields.filter((item) => item.id !== id) });
  }

  function moveField(id, overId) {
    const fields = moveTemplateField(selectedTemplate.fields, id, overId);
    if (fields !== selectedTemplate.fields) updateTemplate({ fields });
  }

  function moveFieldBy(id, direction) {
    const fields = selectedTemplate.fields;
    const index = fields.findIndex((item) => item.id === id);
    const target = fields[index + direction];
    if (target) moveField(id, target.id);
  }

  function move(type, id, direction) {
    commitData((state) => {
      const key = `${type}s`;
      const parentKey = type === "category" ? "domainId" : type === "template" ? "categoryId" : null;
      const items = moveOrderedItemBy(state[key], { id, direction, parentKey });
      return items === state[key] ? state : { ...state, [key]: items };
    });
  }

  function moveTo(type, id, targetParentId) {
    commitData((state) => moveStructureItem(state, type, { id, targetParentId }));
  }

  function drop(type, options) {
    commitData((state) => moveStructureItem(state, type, options));
  }

  function deleteDomain(id) {
    if (data.domains.length < 2) return setToast(t("toast.keepDomain"));
    const domain = data.domains.find((item) => item.id === id);
    if (!window.confirm(t("confirm.deleteDomain", { name: localizeDomainName(domain, locale) }))) return;
    const fallback = data.domains.find((item) => item.id !== id);
    if (!commitData((state) => ({
      ...state,
      domains: state.domains.filter((item) => item.id !== id),
      categories: state.categories.map((item) => item.domainId === id ? { ...item, domainId: fallback.id } : item)
    }))) return;
    closeEditor();
  }

  function deleteCategory(id) {
    if (data.categories.length < 2) return setToast(t("toast.keepCategory"));
    const category = data.categories.find((item) => item.id === id);
    if (!window.confirm(t("confirm.deleteCategory", { name: localizeCategoryName(category, locale) }))) return;
    const fallback = data.categories.find((item) => item.id !== id);
    if (!commitData((state) => ({
      ...state,
      categories: state.categories.filter((item) => item.id !== id),
      entries: state.entries.map((item) => item.categoryId === id ? { ...item, categoryId: fallback.id } : item),
      templates: state.templates.map((item) => item.categoryId === id ? { ...item, categoryId: fallback.id } : item)
    }))) return;
    closeEditor();
  }

  function deleteTemplate(id) {
    if (!window.confirm(t("confirm.deleteTemplate"))) return;
    if (!commitData((state) => ({
      ...state,
      templates: state.templates.filter((item) => item.id !== id),
      entries: state.entries.map((item) => item.templateId === id ? { ...item, templateId: null } : item)
    }))) return;
    closeEditor();
  }

  if (!hydrated) return embedded
    ? <div className="template-manager-loading" role="status">{t("templates.loading")}</div>
    : <main className="loading-screen"><span className="brand-mark">L</span><p>{t("templates.loading")}</p></main>;

  return <RecordSetupScreen
    data={data} embedded={embedded} focusPeriodic={focusPeriodic} selection={selection} selectedDomain={selectedDomain} selectedCategory={selectedCategory}
    selectedTemplate={selectedTemplate} toast={toast}
    focusName={focusTarget?.type === selection?.type && focusTarget?.id === selection?.id}
    onSelect={select} onCloseEditor={closeEditor} onNameFocused={() => setFocusTarget(null)} onNameBlur={normalizeName}
    onCreateDomain={createDomain} onCreateCategory={createCategory} onCreateTemplate={createTemplate} onDuplicateTemplate={duplicateTemplate}
    onUpdate={updateSelected} onUpdateTemplate={updateTemplate} onInputModeChange={setInputMode}
    onAddField={addField} onUpdateField={updateField} onDeleteField={deleteField} onMoveField={moveField} onMoveFieldBy={moveFieldBy}
    onMove={move} onMoveTo={moveTo} onDrop={drop} onDeleteDomain={deleteDomain} onDeleteCategory={deleteCategory} onDeleteTemplate={deleteTemplate}
    onTagsChange={(tags) => updateTemplate({ tags: sanitizeTags(tags) })}
  />;
}
