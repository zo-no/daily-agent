"use client";

/**
 * @fileoverview 编排本地记录首页的数据、视图和记录主链路。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  backupPayload,
  composeTemplateContent,
  DEFAULT_MARKDOWN_SETTINGS,
  fixedContentParts,
  generalStructureTemplate,
  hasFixedContent,
  localDate,
  localTime,
  makeId,
  markdownForAll,
  markdownForDate,
  restoreState,
  sanitizeTags,
  shiftDate,
  structurePayload
} from "@/lib/data.mjs";
import { localizeCategoryName, localizeDomainName, localizeTemplate } from "@/lib/i18n.mjs";
import { downloadFile } from "./download-file";
import { HomeHeader } from "./home-header";
import { useI18n } from "./i18n";
import { RecordComposer } from "./record-composer";
import { SearchDialog } from "./search-dialog";
import { SettingsDialog } from "./settings-dialog";
import { Icon } from "./ui";
import { useLogNoteData, useToast } from "./use-log-note-data";
import "./home-header.css";
import "./home-timeline.css";
import "./entry-composer.css";
import "./search-dialog.css";
import "./settings-dialog.css";

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
  const { data, setData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [viewMode, setViewMode] = useState("timeline");
  const [draft, setDraft] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const deepLinkHandledRef = useRef(false);

  useEffect(() => {
    const handleInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

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
  const periodicEntries = useMemo(
    () => dateEntries
      .filter((entry) => templateMap.get(entry.templateId)?.recordType === "periodic" && entry.content.trim())
      .sort((a, b) => (templateMap.get(a.templateId)?.order || 0) - (templateMap.get(b.templateId)?.order || 0) || a.createdAt - b.createdAt),
    [dateEntries, templateMap]
  );
  const entryGroups = useMemo(() => {
    const groups = new Map(data.domains.map((domain) => [domain.id, []]));
    timelineEntries.forEach((entry) => {
      const category = categoryMap.get(entry.categoryId);
      const domainId = category?.domainId || data.domains[0]?.id;
      if (!groups.has(domainId)) groups.set(domainId, []);
      groups.get(domainId).push(entry);
    });
    return [...groups].map(([domainId, entries]) => ({
      id: domainId,
      name: localizeDomainName(domainMap.get(domainId), locale),
      entries
    }))
      .filter((group) => group.entries.length > 0);
  }, [data.domains, timelineEntries, categoryMap, domainMap, locale]);
  const currentTemplate = data.templates.find((item) => item.id === activeTemplate) || data.templates[0];
  const currentTemplateDisplay = localizeTemplate(currentTemplate, locale);
  const isPeriodicValueDraft = Boolean(draft && currentTemplate?.recordType === "periodic" && currentTemplate?.inputMode === "value");
  const usesStructuredTemplate = Boolean(
    draft && !draft.id && !isPeriodicValueDraft && currentTemplate?.inputMode === "structured" && currentTemplate?.fields?.length
  );

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
    setDraft({
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
    });
  }

  function openEntry(entry) {
    const fixed = fixedContentParts(entry.content);
    setActiveTemplate(entry.templateId || "");
    setDraft({ ...entry, fixedLabel: fixed.label, fixedValue: fixed.value, tags: [...entry.tags] });
    setSearchOpen(false);
  }

  function chooseTemplate(templateId) {
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    const previous = currentTemplate;
    const canReplace = !draft.content.trim() || draft.content === previous?.skeleton;
    setActiveTemplate(template.id);
    setDraft((value) => {
      const content = canReplace
        ? (template.inputMode === "value" ? `${template.name}=` : (template.fields.length ? "" : template.skeleton))
        : value.content;
      const fixed = fixedContentParts(content);
      return {
        ...value,
        content,
        fixedLabel: template.inputMode === "value" ? template.name : fixed.label,
        fixedValue: fixed.value,
        categoryId: template.categoryId,
        tags: [...template.tags],
        templateId: template.id,
        fieldValues: {}
      };
    });
  }

  function saveEntry(event) {
    event.preventDefault();
    if (usesStructuredTemplate) {
      const missing = currentTemplate.fields.find((field) => field.required && !String(draft.fieldValues[field.id] ?? "").trim());
      const displayField = currentTemplateDisplay.fields.find((field) => field.id === missing?.id);
      if (missing) {
        setToast(t("toast.required", { field: displayField?.label || missing.label }));
        return false;
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
    setDraft(null);
    setToast(draft.id ? t("toast.recordUpdated") : t("toast.recordAdded"));
    return true;
  }

  function deleteEntry() {
    if (!draft.id || !window.confirm(t("confirm.deleteRecord"))) return;
    setData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }));
    setDraft(null);
    setToast(t("toast.recordDeleted"));
  }

  function exportToday() {
    downloadFile(`${selectedDate.replaceAll("-", "_")}.md`, markdownForDate(data, selectedDate), "text/markdown;charset=utf-8");
    setToast(t("toast.exported"));
  }

  function exportAll() {
    downloadFile("log-note-all.md", markdownForAll(data), "text/markdown;charset=utf-8");
    setToast(t("toast.exportedAll"));
  }

  function exportJson() {
    downloadFile(`log-note-backup-${localDate()}.json`, backupPayload(data), "application/json;charset=utf-8");
    setToast(t("toast.backupExported"));
  }

  function exportStructure() {
    downloadFile("log-note-structure.json", structurePayload(data), "application/json;charset=utf-8");
    setToast(t("toast.structureExported"));
  }

  function exportGeneralTemplate() {
    downloadFile("log-note-structure-template.json", generalStructureTemplate(), "application/json;charset=utf-8");
    setToast(t("toast.structureExported"));
  }

  function updateMarkdownSetting(key, value) {
    setData((state) => ({
      ...state,
      markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS, ...state.markdownSettings, [key]: value }
    }));
  }

  function resetMarkdownSettings() {
    setData((state) => ({ ...state, markdownSettings: { ...DEFAULT_MARKDOWN_SETTINGS } }));
    setToast(t("toast.markdownReset"));
  }

  async function restoreJson(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm(t("confirm.restore"))) return;
    try {
      setData(restoreState(JSON.parse(await file.text())));
      setSelectedDate(localDate());
      setToast(t("toast.backupRestored"));
    } catch (error) {
      setToast(error.message || t("toast.restoreFailed"));
    }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
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
        onSearch={() => setSearchOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onViewModeChange={setViewMode}
        t={t}
      />

      {viewMode === "timeline" ? (
        <section className="timeline view-panel" aria-live="polite" aria-label={t("home.timelineView")}>
          {timelineEntries.map((entry) => (
            <button className="entry" type="button" key={entry.id} onClick={() => openEntry(entry)}>
              <time>{entry.time || "—"}</time>
              <span className="entry-body">
                <span className="entry-meta">
                  {localizeDomainName(domainMap.get(categoryMap.get(entry.categoryId)?.domainId), locale)} · {localizeCategoryName(categoryMap.get(entry.categoryId), locale)}
                </span>
                <span className="entry-content">{entry.content}</span>
                {!!entry.tags.length && <span className="entry-tags">{entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}</span>}
              </span>
            </button>
          ))}
          {!timelineEntries.length && <div className="timeline-empty">{t("home.noTimelineRecords")}</div>}
        </section>
      ) : (
        <section className="grouped-view view-panel" aria-live="polite" aria-label={t("home.categoryViewLabel")}>
          {entryGroups.map((group) => (
            <section className="record-group" key={group.id}>
              <header className="record-group-header"><h2>{group.name}</h2><span>{group.entries.length}</span></header>
              <div className="record-group-list">
                {group.entries.map((entry) => {
                  const category = localizeCategoryName(categoryMap.get(entry.categoryId), locale);
                  return (
                    <button className="group-entry" type="button" key={entry.id} onClick={() => openEntry(entry)}>
                      <time>{entry.time}</time>
                      <span className="group-entry-body">
                        <span className="entry-content">{entry.content}</span>
                        {(category || entry.tags.length > 0) && (
                          <span className="group-entry-meta">
                            {category && <span>{category}</span>}
                            {entry.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
          {!entryGroups.length && <div className="timeline-empty">{t("home.noRecords")}</div>}
        </section>
      )}

      {!!periodicEntries.length && (
        <section className="fixed-records view-panel" aria-label={t("common.periodicRecords")}>
          <header className="fixed-records-header"><h2>{t("common.periodicRecords")}</h2><span>{periodicEntries.length}</span></header>
          <div className="fixed-records-list">
            {periodicEntries.map((entry) => {
              const category = localizeCategoryName(categoryMap.get(entry.categoryId), locale);
              const domain = localizeDomainName(domainMap.get(categoryMap.get(entry.categoryId)?.domainId), locale);
              const template = templateMap.get(entry.templateId);
              const displayTemplate = localizeTemplate(template, locale);
              const { label, value } = fixedContentParts(entry.content);
              return (
                <button className="fixed-entry" type="button" key={entry.id} onClick={() => openEntry(entry)}>
                  <span className="fixed-entry-scope">{domain}</span>
                  <span className="fixed-entry-label">{displayTemplate?.name || label || category}</span>
                  <span className={`fixed-entry-value ${value || template?.inputMode !== "value" ? "" : "empty"}`}>
                    {template?.inputMode === "value" ? (value || "—") : entry.content}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

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
          onClose={() => setDraft(null)}
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

      <SettingsDialog
        currentDateLabel={compactDate(selectedDate, locale, t)}
        data={data}
        installPrompt={installPrompt}
        locale={locale}
        onClose={() => setSettingsOpen(false)}
        onExportAll={exportAll}
        onExportGeneralTemplate={exportGeneralTemplate}
        onExportJson={exportJson}
        onExportStructure={exportStructure}
        onExportToday={exportToday}
        onInstall={installApp}
        onLocaleChange={setLocale}
        onMarkdownReset={resetMarkdownSettings}
        onMarkdownSettingChange={updateMarkdownSetting}
        onRestore={restoreJson}
        open={settingsOpen}
        selectedDate={selectedDate}
        t={t}
      />

      {toast && <div className="toast"><Icon name="check" />{toast}</div>}
    </main>
  );
}
