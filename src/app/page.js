"use client";

/**
 * @fileoverview 编排本地记录首页的数据、视图和记录主链路。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  composeTemplateContent,
  fixedContentParts,
  hasFixedContent,
  localDate,
  localTime,
  makeId,
  markdownForDate,
  sanitizeTags,
  shiftDate
} from "@/lib/data.mjs";
import { fixedRecordEditorMode, fixedRecordSaveResult } from "@/lib/fixed-record-model.mjs";
import { localizeCategoryName, localizeDomainName, localizeTemplate } from "@/lib/i18n.mjs";
import { downloadFile } from "./download-file";
import { FixedRecords } from "./fixed-records";
import { HomeHeader } from "./home-header";
import { MarkdownContent } from "./markdown-content";
import { useI18n } from "./i18n";
import { RecordComposer } from "./record-composer";
import { SearchDialog } from "./search-dialog";
import { Icon } from "./ui";
import { useLogNoteData, useToast } from "./use-log-note-data";
import "./home-header.css";
import "./home-timeline.css";
import "./entry-composer.css";
import "./search-dialog.css";

function compactDate(dateString, locale, t) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  const today = localDate();
  if (dateString === today) return t("common.today");
  if (dateString === shiftDate(today, -1)) return t("common.yesterday");
  return new Intl.DateTimeFormat(locale, { month: "numeric", day: "numeric" }).format(date);
}

export default function Home() {
  const { locale, setLocale, t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, setData, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [viewMode, setViewMode] = useState("timeline");
  const [draft, setDraft] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [searchOpen, setSearchOpen] = useState(false);
  const deepLinkHandledRef = useRef(false);
  const draftBaselineRef = useRef(null);
  const templateDraftsRef = useRef(new Map());

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      } else if (!typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewEntry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data.categories, data.templates, selectedDate]);

  const domainMap = useMemo(() => new Map(data.domains.map((item) => [item.id, item])), [data.domains]);
  const categoryMap = useMemo(() => new Map(data.categories.map((item) => [item.id, item])), [data.categories]);
  const templateMap = useMemo(() => new Map(data.templates.map((item) => [item.id, item])), [data.templates]);
  const localizedTemplates = useMemo(
    () => {
      const domainOrder = new Map(data.domains.map((item) => [item.id, item.order]));
      const categoryOrder = new Map(data.categories.map((item) => [item.id, item.order]));
      const categoryDomain = new Map(data.categories.map((item) => [item.id, item.domainId]));
      return [...data.templates].sort((a, b) => {
        const domainDifference = (domainOrder.get(categoryDomain.get(a.categoryId)) || 0) - (domainOrder.get(categoryDomain.get(b.categoryId)) || 0);
        const categoryDifference = (categoryOrder.get(a.categoryId) || 0) - (categoryOrder.get(b.categoryId) || 0);
        return domainDifference || categoryDifference || (a.order || 0) - (b.order || 0);
      }).map((template) => localizeTemplate(template, locale));
    },
    [data.templates, data.categories, data.domains, locale]
  );
  const dateEntries = useMemo(
    () => data.entries
      .filter((entry) => entry.date === selectedDate)
      .sort((a, b) => b.time.localeCompare(a.time) || b.createdAt - a.createdAt),
    [data.entries, selectedDate]
  );
  const timelineEntries = useMemo(
    () => dateEntries.filter((entry) => templateMap.get(entry.templateId)?.recordType !== "periodic"),
    [dateEntries, templateMap]
  );
  const periodicTemplates = useMemo(
    () => localizedTemplates.filter((template) => template.recordType === "periodic" && template.homeVisible !== false),
    [localizedTemplates]
  );
  const periodicEntryMap = useMemo(() => {
    const entries = new Map();
    dateEntries.forEach((entry) => {
      if (templateMap.get(entry.templateId)?.recordType === "periodic" && entry.content.trim() && !entries.has(entry.templateId)) {
        entries.set(entry.templateId, entry);
      }
    });
    return entries;
  }, [dateEntries, templateMap]);
  const periodicItems = useMemo(() => periodicTemplates.map((displayTemplate) => {
    const template = templateMap.get(displayTemplate.id);
    const entry = periodicEntryMap.get(template.id);
    const categoryId = entry?.categoryId || template.categoryId;
    const category = categoryMap.get(categoryId);
    return {
      template,
      displayTemplate,
      entry,
      domain: localizeDomainName(domainMap.get(category?.domainId), locale),
      categoryId
    };
  }), [periodicTemplates, periodicEntryMap, templateMap, categoryMap, domainMap, locale]);
  const categoryGroups = useMemo(() => data.domains
    .map((domain) => {
      const categories = data.categories
        .filter((category) => category.domainId === domain.id)
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .map((category) => ({
          id: category.id,
          name: localizeCategoryName(category, locale),
          entries: timelineEntries.filter((entry) => entry.categoryId === category.id),
          periodicItems: periodicItems.filter((item) => item.categoryId === category.id)
        }))
        .filter((category) => category.entries.length || category.periodicItems.length);
      return { id: domain.id, name: localizeDomainName(domain, locale), categories };
    })
    .filter((domain) => domain.categories.length), [data.domains, data.categories, timelineEntries, periodicItems, locale]);
  const currentTemplate = data.templates.find((item) => item.id === activeTemplate) || data.templates[0];
  const currentTemplateDisplay = localizeTemplate(currentTemplate, locale);
  const isPeriodicValueDraft = Boolean(draft && currentTemplate?.recordType === "periodic" && currentTemplate?.inputMode === "value");
  const usesStructuredTemplate = Boolean(
    draft && !isPeriodicValueDraft && currentTemplate?.inputMode === "structured" && currentTemplate?.fields?.length && (
      !draft.id || (
        Object.keys(draft.fieldValues || {}).length > 0 &&
        Object.keys(draft.fieldValues || {}).every((fieldId) => currentTemplate.fields.some((field) => field.id === fieldId))
      )
    )
  );

  function setDraftWithBaseline(nextDraft) {
    draftBaselineRef.current = nextDraft ? JSON.stringify(nextDraft) : null;
    setDraft(nextDraft);
  }

  function closeDraft() {
    if (!draft) return;
    const changed = JSON.stringify(draft) !== draftBaselineRef.current;
    const drafts = [...templateDraftsRef.current.values(), draft];
    const hasNewContent = drafts.some((item) => Boolean(
      item?.content?.trim() || item?.fixedValue?.trim() ||
      Object.values(item?.fieldValues || {}).some((value) => String(value).trim())
    ));
    if ((draft.id ? changed : hasNewContent) && !window.confirm(t("confirm.discardDraft"))) return;
    templateDraftsRef.current.clear();
    setDraft(null);
  }

  useEffect(() => {
    if (!hydrated || deepLinkHandledRef.current) return;
    deepLinkHandledRef.current = true;
    const params = new URLSearchParams(window.location.search);
    const entry = data.entries.find((item) => item.id === params.get("entry"));
    const templateId = params.get("newTemplate");
    const requestedDate = params.get("date") || localDate();
    if (entry) {
      setSelectedDate(entry.date);
      openEntry(entry);
    } else if (templateId && templateMap.get(templateId)?.recordType === "periodic") {
      setSelectedDate(requestedDate);
      openNewEntry(templateId, "", requestedDate);
    }
    if (entry || templateId) window.history.replaceState({}, "", "/");
  }, [hydrated, data.entries, templateMap]);

  function openNewEntry(templateId = "quick", categoryIdOverride = "", dateOverride = "") {
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    const content = template?.inputMode === "value" ? `${template.name}=` : (template?.skeleton || "");
    const fixed = fixedContentParts(content);
    setActiveTemplate(template?.id || "");
    const nextDraft = {
      id: null,
      date: dateOverride || selectedDate,
      time: localTime(),
      content,
      fixedLabel: template?.inputMode === "value" ? template.name : fixed.label,
      fixedValue: fixed.value,
      categoryId: categoryIdOverride || template?.categoryId || data.categories[0]?.id || "",
      tags: template?.tags || [],
      templateId: template?.id || null,
      fieldValues: {},
      createdAt: Date.now()
    };
    templateDraftsRef.current = new Map([[template?.id || "", nextDraft]]);
    setDraftWithBaseline(nextDraft);
  }

  function openEntry(entry) {
    const fixed = fixedContentParts(entry.content);
    setActiveTemplate(entry.templateId || "");
    templateDraftsRef.current.clear();
    setDraftWithBaseline({ ...entry, fixedLabel: fixed.label, fixedValue: fixed.value, tags: [...entry.tags] });
    setSearchOpen(false);
  }

  function chooseTemplate(templateId) {
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    const previous = currentTemplate;
    templateDraftsRef.current.set(previous?.id || activeTemplate, draft);
    const cached = templateDraftsRef.current.get(template.id);
    setActiveTemplate(template.id);
    setDraft((value) => {
      if (cached) return { ...cached, date: value.date, time: value.time };
      const canReplace = !value.content.trim() || value.content === previous?.skeleton;
      const content = canReplace
        ? (template.inputMode === "value" ? `${template.name}=` : (template.fields.length ? "" : template.skeleton))
        : value.content;
      const fixed = fixedContentParts(content);
      const next = {
        ...value,
        content,
        fixedLabel: template.inputMode === "value" ? template.name : fixed.label,
        fixedValue: fixed.value,
        categoryId: template.categoryId,
        tags: [...template.tags],
        templateId: template.id,
        fieldValues: {}
      };
      templateDraftsRef.current.set(template.id, next);
      return next;
    });
  }

  function saveEntry(event) {
    event.preventDefault();
    if (usesStructuredTemplate) {
      const missing = currentTemplate.fields.find((field) => field.required && !String(draft.fieldValues[field.id] ?? "").trim());
      const displayField = currentTemplateDisplay.fields.find((field) => field.id === missing?.id);
      if (missing) {
        setToast(t("toast.required", { field: displayField?.label || missing.label }));
        return missing.id;
      }
    }
    if (isPeriodicValueDraft) {
      const label = String(currentTemplate?.name || draft.fixedLabel || "").trim();
      const value = String(draft.fixedValue || "").trim();
      if (!label) {
        setToast(t("toast.fixedNameRequired"));
        return false;
      }
      if (!hasFixedContent(`${label}=${value}`)) {
        if (draft.id) {
          setData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }));
          setDraft(null);
          setToast(t("toast.emptyRecordDeleted"));
        } else {
          setToast(t("toast.fixedValueRequired"));
        }
        return false;
      }
    }
    const content = (isPeriodicValueDraft
      ? `${String(currentTemplate?.name || draft.fixedLabel).trim()}=${String(draft.fixedValue).trim()}`
      : usesStructuredTemplate
        ? composeTemplateContent(currentTemplateDisplay, draft.fieldValues)
        : draft.content).trim();
    if (!content) {
      setToast(t("toast.writeSomething"));
      return false;
    }
    const now = Date.now();
    const entry = {
      ...draft,
      id: draft.id || makeId("entry"),
      content,
      tags: sanitizeTags(draft.tags),
      templateId: draft.templateId,
      fieldValues: draft.fieldValues,
      createdAt: draft.createdAt || now
    };
    setData((state) => ({
      ...state,
      entries: draft.id ? state.entries.map((item) => item.id === draft.id ? entry : item) : [...state.entries, entry]
    }));
    setSelectedDate(entry.date);
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(draft.id ? t("toast.recordUpdated") : t("toast.recordAdded"));
    return true;
  }

  function deleteEntry() {
    if (!draft.id || !window.confirm(t("confirm.deleteRecord"))) return;
    setData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }));
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(t("toast.recordDeleted"));
  }

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

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("home.loading")}</p></main>;
  }

  return (
    <main className="app-shell">
      <HomeHeader
        locale={locale}
        selectedDate={selectedDate}
        viewMode={viewMode}
        onDateChange={setSelectedDate}
        onLocaleChange={setLocale}
        onSearch={() => setSearchOpen(true)}
        onViewModeChange={setViewMode}
        t={t}
      />

      <div className={`home-workspace ${timelineEntries.length ? "has-timeline-records" : "is-timeline-empty"}`}>
        <div className="home-record-stream">
      {viewMode === "timeline" ? (
        <section className="timeline view-panel" aria-live="polite" aria-label={t("home.timelineView")}>
          {timelineEntries.map((entry) => (
            <button className="entry" type="button" key={entry.id} onClick={() => openEntry(entry)}>
              <time>{entry.time || "—"}</time>
              <span className="entry-body">
                <span className="entry-meta">
                  {localizeDomainName(domainMap.get(categoryMap.get(entry.categoryId)?.domainId), locale)} · {localizeCategoryName(categoryMap.get(entry.categoryId), locale)}
                </span>
                <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                {!!entry.tags.length && <span className="entry-tags">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</span>}
              </span>
            </button>
          ))}
          {!timelineEntries.length && <div className="timeline-empty">{t("home.noTimelineRecords")}</div>}
        </section>
      ) : (
        <section className="grouped-view view-panel" aria-live="polite" aria-label={t("home.categoryViewLabel")}>
          {categoryGroups.map((domain) => (
            <section className="record-domain" key={domain.id}>
              <header className="record-domain-header"><h2>{domain.name}</h2><span>{domain.categories.length}</span></header>
              {domain.categories.map((category) => (
                <section className="record-category" key={category.id}>
                  <header className="record-category-header">
                    <h3>{category.name}</h3>
                    <span>{category.entries.length + category.periodicItems.length}</span>
                  </header>
                  <div className="record-group-list">
                    {category.entries.map((entry) => (
                      <button className="group-entry" type="button" key={entry.id} onClick={() => openEntry(entry)}>
                        <time>{entry.time}</time>
                        <span className="group-entry-body">
                          <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                          {!!entry.tags.length && <span className="group-entry-meta">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</span>}
                        </span>
                      </button>
                    ))}
                    {!!category.periodicItems.length && <FixedRecords items={category.periodicItems} onSave={saveFixedInline} t={t} embedded />}
                  </div>
                </section>
              ))}
            </section>
          ))}
          {!categoryGroups.length && <div className="timeline-empty">{t("home.noRecords")}</div>}
        </section>
      )}
        </div>

      {viewMode === "timeline" && <FixedRecords items={periodicItems} onSave={saveFixedInline} t={t} />}
      </div>

      <div className="action-dock" aria-label={t("home.quickActions")}>
        <button className="export-fab" type="button" onClick={exportToday} aria-label={t("home.exportCurrent", { date: compactDate(selectedDate, locale, t) })}>
          <Icon name="download" size={22} />
        </button>
        <button className="fab" type="button" onClick={() => openNewEntry()} aria-label={t("home.addRecord")}>
          <Icon name="plus" size={30} />
        </button>
      </div>

      {draft && (
        <RecordComposer
          activeTemplate={activeTemplate}
          categories={data.categories}
          categoryMap={categoryMap}
          currentTemplateDisplay={currentTemplateDisplay}
          draft={draft}
          isPeriodicValueDraft={isPeriodicValueDraft}
          locale={locale}
          localizedTemplates={localizedTemplates}
          onChooseTemplate={chooseTemplate}
          onClose={closeDraft}
          onDelete={deleteEntry}
          onDraftChange={setDraft}
          onSave={saveEntry}
          t={t}
          usesStructuredTemplate={usesStructuredTemplate}
        />
      )}

      <SearchDialog
        open={searchOpen}
        entries={data.entries}
        categoryMap={categoryMap}
        locale={locale}
        onClose={() => setSearchOpen(false)}
        onSelect={(entry) => {
          setSelectedDate(entry.date);
          openEntry(entry);
        }}
        t={t}
      />

      {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" />{toast}</div>}
    </main>
  );
}
