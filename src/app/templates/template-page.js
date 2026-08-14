"use client";

/**
 * @fileoverview 管理记录领域、分类、模板及结构导出操作。
 */

import { useEffect, useRef, useState } from "react";
import {
  backupPayload,
  generalStructureTemplate,
  hasTemplateContent,
  localDate,
  makeId,
  markdownForAll,
  markdownForDate,
  sanitizeTags,
  structurePayload
} from "@/lib/data.mjs";
import { localizeCategoryName, localizeDomainName } from "@/lib/i18n.mjs";
import { downloadFile } from "../download-file";
import { useI18n } from "../i18n";
import { useLogNoteData, useToast } from "../use-log-note-data";
import { TemplateScreen } from "./template-screen";

function nextOrder(items) {
  return items.length ? Math.max(...items.map((item) => Number(item.order) || 0)) + 1 : 0;
}

function reorder(items, id, direction, sibling) {
  const siblings = items.filter(sibling).sort((a, b) => a.order - b.order);
  const index = siblings.findIndex((item) => item.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return items;
  const orders = new Map(siblings.map((item, itemIndex) => [item.id, itemIndex]));
  orders.set(siblings[index].id, target);
  orders.set(siblings[target].id, index);
  return items.map((item) => orders.has(item.id) ? { ...item, order: orders.get(item.id) } : item);
}

/** 组织结构管理页的数据操作，并将渲染委托给 TemplateScreen。 */
export function TemplatePage() {
  const { locale, t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, setData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [tab, setTab] = useState("structure");
  const [selection, setSelection] = useState(null);
  const [focusTarget, setFocusTarget] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const emptyTemplatesCleanedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || emptyTemplatesCleanedRef.current) return;
    emptyTemplatesCleanedRef.current = true;
    setData((state) => {
      const templates = state.templates.filter(hasTemplateContent);
      return templates.length === state.templates.length ? state : { ...state, templates };
    });
  }, [hydrated, setData]);

  const selectedDomain = selection?.type === "domain" ? data.domains.find((item) => item.id === selection.id) : null;
  const selectedCategory = selection?.type === "category" ? data.categories.find((item) => item.id === selection.id) : null;
  const selectedTemplate = selection?.type === "template" ? data.templates.find((item) => item.id === selection.id) : null;

  function select(type, id) {
    setSelection({ type, id });
    setFocusTarget(null);
  }

  function createDomain() {
    const id = makeId("domain");
    setData((state) => ({ ...state, domains: [...state.domains, { id, name: t("templates.untitledDomain"), order: nextOrder(state.domains) }] }));
    setSelection({ type: "domain", id });
    setFocusTarget({ type: "domain", id });
  }

  function createCategory(domainId) {
    const id = makeId("category");
    setData((state) => ({
      ...state,
      categories: [...state.categories, {
        id, domainId: domainId || state.domains[0]?.id || "", name: t("templates.untitledCategory"),
        order: nextOrder(state.categories.filter((item) => item.domainId === domainId))
      }]
    }));
    setSelection({ type: "category", id });
    setFocusTarget({ type: "category", id });
  }

  function createTemplate(categoryId) {
    const id = makeId("template");
    setData((state) => ({
      ...state,
      templates: [...state.templates, {
        id, name: t("templates.untitled"), categoryId: categoryId || state.categories[0]?.id || "",
        order: nextOrder(state.templates.filter((item) => item.categoryId === categoryId)),
        recordType: "linear", schedule: null, inputMode: "free", tags: [], prompt: "", skeleton: "", fields: []
      }]
    }));
    setSelection({ type: "template", id });
    setFocusTarget({ type: "template", id });
  }

  function closeEditor() {
    if (selectedTemplate && !hasTemplateContent(selectedTemplate)) {
      setData((state) => ({ ...state, templates: state.templates.filter((item) => item.id !== selectedTemplate.id) }));
    }
    setSelection(null);
    setFocusTarget(null);
  }

  function updateSelected(patch) {
    if (!selection) return;
    const key = `${selection.type}s`;
    setData((state) => ({ ...state, [key]: state[key].map((item) => item.id === selection.id ? { ...item, ...patch } : item) }));
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

  function move(type, id, direction) {
    setData((state) => {
      if (type === "domain") return { ...state, domains: reorder(state.domains, id, direction, () => true) };
      if (type === "category") {
        const item = state.categories.find((category) => category.id === id);
        return { ...state, categories: reorder(state.categories, id, direction, (category) => category.domainId === item.domainId) };
      }
      const item = state.templates.find((template) => template.id === id);
      return { ...state, templates: reorder(state.templates, id, direction, (template) => template.categoryId === item.categoryId) };
    });
  }

  function deleteDomain(id) {
    if (data.domains.length < 2) return setToast(t("toast.keepDomain"));
    const domain = data.domains.find((item) => item.id === id);
    if (!window.confirm(t("confirm.deleteDomain", { name: localizeDomainName(domain, locale) }))) return;
    const fallback = data.domains.find((item) => item.id !== id);
    setData((state) => ({
      ...state,
      domains: state.domains.filter((item) => item.id !== id),
      categories: state.categories.map((item) => item.domainId === id ? { ...item, domainId: fallback.id } : item)
    }));
    closeEditor();
  }

  function deleteCategory(id) {
    if (data.categories.length < 2) return setToast(t("toast.keepCategory"));
    const category = data.categories.find((item) => item.id === id);
    if (!window.confirm(t("confirm.deleteCategory", { name: localizeCategoryName(category, locale) }))) return;
    const fallback = data.categories.find((item) => item.id !== id);
    setData((state) => ({
      ...state,
      categories: state.categories.filter((item) => item.id !== id),
      entries: state.entries.map((item) => item.categoryId === id ? { ...item, categoryId: fallback.id } : item),
      templates: state.templates.map((item) => item.categoryId === id ? { ...item, categoryId: fallback.id } : item)
    }));
    closeEditor();
  }

  function deleteTemplate(id) {
    if (!window.confirm(t("confirm.deleteTemplate"))) return;
    setData((state) => ({
      ...state,
      templates: state.templates.filter((item) => item.id !== id),
      entries: state.entries.map((item) => item.templateId === id ? { ...item, templateId: null } : item)
    }));
    closeEditor();
  }

  function exportFile(kind) {
    const date = localDate();
    const options = {
      all: ["log-note-all.md", markdownForAll(data), "text/markdown;charset=utf-8"],
      today: [`${date.replaceAll("-", "_")}.md`, markdownForDate(data, date), "text/markdown;charset=utf-8"],
      backup: [`log-note-backup-${date}.json`, backupPayload(data), "application/json;charset=utf-8"],
      structure: ["log-note-structure.json", structurePayload(data), "application/json;charset=utf-8"],
      general: ["log-note-structure-template.json", generalStructureTemplate(), "application/json;charset=utf-8"]
    };
    downloadFile(...options[kind]);
    setExportOpen(false);
    setToast(kind === "structure" || kind === "general" ? t("toast.structureExported") : t("toast.exported"));
  }

  if (!hydrated) return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("templates.loading")}</p></main>;

  return <TemplateScreen
    data={data} tab={tab} selection={selection} selectedDomain={selectedDomain} selectedCategory={selectedCategory}
    selectedTemplate={selectedTemplate} exportOpen={exportOpen} toast={toast}
    focusName={focusTarget?.type === selection?.type && focusTarget?.id === selection?.id}
    onTab={setTab} onSelect={select} onCloseEditor={closeEditor} onNameFocused={() => setFocusTarget(null)} onNameBlur={normalizeName}
    onCreateDomain={createDomain} onCreateCategory={createCategory} onCreateTemplate={createTemplate}
    onUpdate={updateSelected} onUpdateTemplate={updateTemplate} onInputModeChange={setInputMode}
    onAddField={addField} onUpdateField={updateField} onDeleteField={deleteField}
    onMove={move} onDeleteDomain={deleteDomain} onDeleteCategory={deleteCategory} onDeleteTemplate={deleteTemplate}
    onTagsChange={(tags) => updateTemplate({ tags: sanitizeTags(tags) })}
    onOpenExport={() => setExportOpen(true)} onCloseExport={() => setExportOpen(false)} onExport={exportFile}
  />;
}
