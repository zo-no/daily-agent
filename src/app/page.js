"use client";

/**
 * @fileoverview 编排本地记录首页的数据、视图和记录主链路。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  composeTemplateContent,
  fixedContentParts,
  hasFixedContent,
  localDate,
  localTime,
  makeId,
  markdownForDate,
  sanitizeTags
} from "@/lib/data.mjs";
import { fixedRecordEditorMode, fixedRecordSaveResult } from "@/lib/fixed-record-model.mjs";
import { localizeTemplate } from "@/lib/i18n.mjs";
import { normalizePlanBlock } from "@/lib/plan-model.mjs";
import { compactDateLabel } from "./date-label";
import { downloadFile } from "./download-file";
import { FixedRecords } from "./fixed-records";
import { HomeHeader, WorkspaceModeSwitch } from "./home-header";
import { DomainDirectoryRail } from "./home-domain-rail";
import { HomeRecordViews } from "./home-record-views";
import { useI18n } from "./i18n";
import { useGoogleCalendar } from "./google-calendar-provider";
import { RecordComposer } from "./record-composer";
import { SearchDialog } from "./search-dialog";
import { SettingsPage } from "./settings/settings-page";
import { Icon } from "./ui";
import { useDraftAttachments } from "./use-draft-attachments";
import { useHomeRecordModel } from "./use-home-record-model";
import { useHomeDateSwipe } from "./use-home-date-swipe";
import { useLogNoteData, useToast } from "./use-log-note-data";
import "./home-header.css";
import "./date-disclosure.css";
import "./home-calendar.css";
import "./home-day-plan.css";
import "./home-timeline.css";
import "./home-fixed-records.css";
import "./entry-composer.css";
import "./attachments.css";
import "./search-dialog.css";
import "./management-header.css";
import "./settings-dialog.css";
import "./templates/templates.css";

/** Orchestrates the quick-record loop and delegates derived views and attachment drafts. */
export default function Home() {
  const { locale, t } = useI18n();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const googleCalendar = useGoogleCalendar();
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [viewMode, setViewMode] = useState("timeline");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dayPlanActive, setDayPlanActive] = useState(false);
  const [draft, setDraft] = useState(null);
  const [activeTemplate, setActiveTemplate] = useState("quick");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const monthTriggerRef = useRef(null);
  const searchTriggerRef = useRef(null);
  const settingsTriggerRef = useRef(null);
  const calendarReturnScrollRef = useRef(null);
  const toolReturnScrollRef = useRef(null);
  const calendarOpenedDateRef = useRef(null);
  const calendarScrollFrameRef = useRef(0);
  const calendarViewportWidthRef = useRef(null);
  const railSectionRefs = useRef(new Map());
  const deepLinkHandledRef = useRef(false);
  const draftBaselineRef = useRef(null);
  const templateDraftsRef = useRef(new Map());

  useEffect(() => {
    const handler = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if (event.key === "Escape" && !draft && (searchOpen || settingsOpen)) {
        event.preventDefault();
        if (searchOpen) closeSearch();
        else closeSettings();
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        if (draft || searchOpen || settingsOpen) return;
        event.preventDefault();
        openSearch();
      } else if (!draft && !searchOpen && !settingsOpen && !typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        openNewEntry();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [calendarOpen, data.categories, data.templates, draft, searchOpen, settingsOpen, selectedDate]);

  useEffect(() => () => cancelAnimationFrame(calendarScrollFrameRef.current), []);

  useEffect(() => {
    if (!calendarOpen) return undefined;
    const viewportWidth = () => document.documentElement.clientWidth || window.innerWidth;
    calendarViewportWidthRef.current = viewportWidth();
    const keepCalendarVisible = () => {
      const nextWidth = viewportWidth();
      if (Math.abs(nextWidth - calendarViewportWidthRef.current) < 1) return;
      calendarViewportWidthRef.current = nextWidth;
      scheduleCalendarScroll(0, { smooth: false });
    };
    window.addEventListener("resize", keepCalendarVisible);
    window.visualViewport?.addEventListener("resize", keepCalendarVisible);
    return () => {
      window.removeEventListener("resize", keepCalendarVisible);
      window.visualViewport?.removeEventListener("resize", keepCalendarVisible);
      calendarViewportWidthRef.current = null;
    };
  }, [calendarOpen]);

  const {
    categoryGroups,
    categoryMap,
    domainMap,
    localizedTemplates,
    periodicDomainGroups,
    periodicEntryMap,
    periodicItems,
    templateMap,
    timelineEntries
  } = useHomeRecordModel(data, selectedDate, locale);
  const railSections = useMemo(() => {
    if (calendarOpen || dayPlanActive) return [];
    if (viewMode === "timeline") {
      return [
        ...(timelineEntries.length ? [{ id: "timeline:records", name: t("common.record"), targetId: "timeline-records", kind: "record" }] : []),
        ...periodicDomainGroups.map((group) => ({
          id: `timeline:domain:${group.id}`,
          domainId: group.id,
          name: group.name || t("common.uncategorized"),
          targetId: `timeline-fixed-domain-${group.id}`,
          kind: "domain"
        }))
      ];
    }
    return categoryGroups.map((domain) => ({
      id: `grouped:domain:${domain.id}`,
      domainId: domain.id,
      name: domain.name,
      targetId: `record-domain-${domain.id}`,
      kind: "domain"
    }));
  }, [calendarOpen, categoryGroups, dayPlanActive, periodicDomainGroups, t, timelineEntries.length, viewMode]);
  const {
    addAttachment,
    attachmentBusy,
    deleteDraftAttachments,
    discardAttachmentChanges,
    finalizeAttachmentChanges,
    removeAttachment
  } = useDraftAttachments({ draft, setDraft, setToast, t });
  const currentTemplate = data.templates.find((item) => item.id === activeTemplate) || data.templates[0];
  const visiblePlanBlocks = useMemo(() => [...data.planBlocks, ...googleCalendar.timedEvents], [data.planBlocks, googleCalendar.timedEvents]);
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
  const { motion: dateSwipeMotion, swipeProps, swipeStyle } = useHomeDateSwipe({
    calendarOpen,
    disabled: Boolean(draft || searchOpen || settingsOpen),
    locale,
    onDateChange: changeSelectedDate,
    selectedDate
  });

  function setDraftWithBaseline(nextDraft) {
    draftBaselineRef.current = nextDraft ? JSON.stringify(nextDraft) : null;
    setDraft(nextDraft);
  }

  async function closeDraft() {
    if (!draft || attachmentBusy) return;
    const changed = JSON.stringify(draft) !== draftBaselineRef.current;
    const drafts = [...templateDraftsRef.current.values(), draft];
    const hasNewContent = drafts.some((item) => Boolean(
      item?.content?.trim() || item?.fixedValue?.trim() ||
      Object.values(item?.fieldValues || {}).some((value) => String(value).trim()) || item?.attachments?.length
    ));
    if ((draft.id ? changed : hasNewContent) && !window.confirm(t("confirm.discardDraft"))) return;
    await discardAttachmentChanges();
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
      attachments: [],
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

  /** Switches the draft template without hiding or silently discarding an attached image. */
  function chooseTemplate(templateId) {
    const template = data.templates.find((item) => item.id === templateId) || data.templates[0];
    if (draft.attachments?.length && template?.inputMode !== "free") {
      setToast(t("toast.removeAttachmentBeforeTemplate"));
      return;
    }
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

  /** Persists the active draft before committing its staged attachment cleanup. */
  async function saveEntry(event) {
    event.preventDefault();
    if (attachmentBusy) return false;
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
          const deleted = commitData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }));
          if (!deleted) return false;
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
    if (!content && !draft.attachments?.length) {
      setToast(t("toast.writeSomething"));
      return false;
    }
    const now = Date.now();
    const entry = {
      id: draft.id || makeId("entry"),
      date: draft.date,
      time: draft.time,
      content,
      categoryId: draft.categoryId,
      tags: sanitizeTags(draft.tags),
      templateId: draft.templateId,
      fieldValues: draft.fieldValues,
      attachments: draft.attachments || [],
      createdAt: draft.createdAt || now
    };
    const saved = commitData((state) => ({
      ...state,
      entries: draft.id ? state.entries.map((item) => item.id === draft.id ? entry : item) : [...state.entries, entry]
    }));
    if (!saved) return false;
    const attachmentsCleaned = await finalizeAttachmentChanges(entry.attachments);
    setSelectedDate(entry.date);
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(attachmentsCleaned ? (draft.id ? t("toast.recordUpdated") : t("toast.recordAdded")) : t("toast.attachmentCleanupPending"));
    return true;
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

  async function deleteEntry() {
    if (attachmentBusy || !draft.id || !window.confirm(t("confirm.deleteRecord"))) return;
    if (!commitData((state) => ({ ...state, entries: state.entries.filter((item) => item.id !== draft.id) }))) return;
    const attachmentsCleaned = await deleteDraftAttachments(draft.attachments || []);
    templateDraftsRef.current.clear();
    setDraft(null);
    setToast(attachmentsCleaned ? t("toast.recordDeleted") : t("toast.attachmentCleanupPending"));
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

  function changeViewMode(nextMode) {
    setViewMode(nextMode);
  }

  function changeDayPlanMode(active) {
    setDayPlanActive(active);
  }

  function changeSelectedDate(nextDate) {
    setSelectedDate(nextDate);
    if (calendarOpen) scheduleCalendarScroll(0, { smooth: false });
  }

  function scheduleCalendarScroll(top, { smooth = true } = {}) {
    cancelAnimationFrame(calendarScrollFrameRef.current);
    calendarScrollFrameRef.current = requestAnimationFrame(() => {
      calendarScrollFrameRef.current = requestAnimationFrame(() => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top, left: 0, behavior: smooth && !reducedMotion ? "smooth" : "auto" });
      });
    });
  }

  function setCalendarVisibility(nextOpen) {
    const shouldOpen = typeof nextOpen === "function" ? nextOpen(calendarOpen) : Boolean(nextOpen);
    if (shouldOpen === calendarOpen) return;

    if (shouldOpen) {
      setSearchOpen(false);
      setSettingsOpen(false);
      calendarReturnScrollRef.current = window.scrollY;
      calendarOpenedDateRef.current = selectedDate;
      setCalendarOpen(true);
      scheduleCalendarScroll(0);
      return;
    }

    const returnScroll = calendarOpenedDateRef.current === selectedDate
      ? calendarReturnScrollRef.current
      : null;
    calendarReturnScrollRef.current = null;
    calendarOpenedDateRef.current = null;
    setCalendarOpen(false);
    if (Number.isFinite(returnScroll)) scheduleCalendarScroll(returnScroll);
  }

  function openSearch() {
    if (searchOpen) {
      closeSearch();
      return;
    }
    if (calendarOpen) setCalendarVisibility(false);
    if (!settingsOpen) toolReturnScrollRef.current = window.scrollY;
    setSettingsOpen(false);
    setSearchOpen(true);
  }

  function openSettings() {
    if (settingsOpen) {
      closeSettings();
      return;
    }
    if (calendarOpen) setCalendarVisibility(false);
    if (!searchOpen) toolReturnScrollRef.current = window.scrollY;
    setSearchOpen(false);
    setSettingsOpen(true);
  }

  function closeSearch() {
    const returnScroll = toolReturnScrollRef.current;
    toolReturnScrollRef.current = null;
    setSearchOpen(false);
    if (Number.isFinite(returnScroll)) scheduleCalendarScroll(returnScroll, { smooth: false });
    requestAnimationFrame(() => searchTriggerRef.current?.focus({ preventScroll: true }));
  }

  function closeSettings() {
    const returnScroll = toolReturnScrollRef.current;
    toolReturnScrollRef.current = null;
    setSettingsOpen(false);
    if (Number.isFinite(returnScroll)) scheduleCalendarScroll(returnScroll, { smooth: false });
    requestAnimationFrame(() => settingsTriggerRef.current?.focus({ preventScroll: true }));
  }

  function registerRailSection(sectionId, node) {
    if (node) railSectionRefs.current.set(sectionId, node);
    else railSectionRefs.current.delete(sectionId);
  }

  if (!hydrated) {
    return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("home.loading")}</p></main>;
  }

  return (
    <main
      className={`app-shell${dayPlanActive ? " is-day-plan" : ""}`}
      data-page-navigation-motion={dateSwipeMotion.direction}
      data-page-swipe-phase={dateSwipeMotion.phase}
      style={swipeStyle}
      {...swipeProps}
    >
      <img className="home-edge-rail-brush" src="/ui/diary/rail-brush-handdrawn.png" alt="" aria-hidden="true" />

      <HomeHeader
        calendarOpen={calendarOpen}
        dayPlanActive={dayPlanActive}
        locale={locale}
        selectedDate={selectedDate}
        searchOpen={searchOpen}
        settingsOpen={settingsOpen}
        searchTriggerRef={searchTriggerRef}
        settingsTriggerRef={settingsTriggerRef}
        triggerRef={monthTriggerRef}
        viewMode={viewMode}
        onCalendarToggle={() => setCalendarVisibility(!calendarOpen)}
        onSearch={openSearch}
        onSettings={openSettings}
        onViewModeChange={changeViewMode}
        t={t}
      />

      {!searchOpen && !settingsOpen && railSections.length > 0 && (
        <DomainDirectoryRail
          sections={railSections}
          sectionRefs={railSectionRefs}
          selectedDate={selectedDate}
          t={t}
        />
      )}

      <div className={`home-workspace ${timelineEntries.length ? "has-timeline-records" : "is-timeline-empty"}`}>
        <div
          className={`home-diary-workspace${searchOpen || settingsOpen ? " is-tool-hidden" : ""}`}
          aria-hidden={searchOpen || settingsOpen ? "true" : undefined}
          inert={searchOpen || settingsOpen || undefined}
        >
          <div className="home-record-stream">
            <HomeRecordViews
              calendarTriggerRef={monthTriggerRef}
              calendarOpen={calendarOpen}
              categoryGroups={categoryGroups}
              categoryMap={categoryMap}
              dayPlanActive={dayPlanActive}
              domainMap={domainMap}
              entries={data.entries}
              locale={locale}
              onCalendarOpenChange={setCalendarVisibility}
              onDateChange={changeSelectedDate}
              onDeletePlan={deletePlanBlock}
              onOpenEntry={openEntry}
              onSaveFixed={saveFixedInline}
              onSavePlan={savePlanBlock}
              registerRailSection={registerRailSection}
              planBlocks={visiblePlanBlocks}
              allDayPlans={googleCalendar.allDayEvents}
              selectedDate={selectedDate}
              t={t}
              timelineEntries={timelineEntries}
              viewMode={viewMode}
            />
          </div>

          {!dayPlanActive && timelineEntries.length > 0 && (
            <div className="organize-helper-slot">
              <Link className="organize-helper" href={`/organize?date=${encodeURIComponent(selectedDate)}`} aria-label={t("organize.open")} data-date={selectedDate}>
                <img className="organize-helper-path" src="/ui/diary/organize-path.png" alt="" aria-hidden="true" />
                <img className="organize-helper-figure" src="/ui/diary/organize-helper.png" alt="" aria-hidden="true" />
                <span className="visually-hidden">{t("organize.open")}</span>
              </Link>
            </div>
          )}

          {viewMode === "timeline" && !dayPlanActive && (
            <FixedRecords
              items={periodicItems}
              groups={periodicDomainGroups}
              onRegisterRailSection={registerRailSection}
              onSave={saveFixedInline}
              t={t}
            />
          )}
        </div>

        {(searchOpen || settingsOpen) && (
          <div className="home-tool-workspace home-record-stream">
            {searchOpen ? (
              <SearchDialog
                embedded
                open
                entries={data.entries}
                categoryMap={categoryMap}
                locale={locale}
                onClose={closeSearch}
                onSelect={(entry) => {
                  toolReturnScrollRef.current = null;
                  setSelectedDate(entry.date);
                  openEntry(entry);
                }}
                t={t}
              />
            ) : (
              <SettingsPage embedded workspace onClose={closeSettings} />
            )}
          </div>
        )}
      </div>

      <div className={`action-dock action-rail${dayPlanActive ? " is-day-plan-navigation" : ""}`} aria-label={t("home.quickActions")} data-edge-rail-item="workspace-actions">
        <WorkspaceModeSwitch dayPlanActive={dayPlanActive} onDayPlanChange={changeDayPlanMode} t={t} />
        {!dayPlanActive && (
          <div className="record-action-row">
            <button className="export-fab" data-edge-rail-item="export" type="button" onClick={exportToday} aria-label={t("home.exportCurrent", { date: compactDateLabel(selectedDate, locale, t) })}>
              <img src="/ui/diary/export-stamp.png" alt="" aria-hidden="true" />
            </button>
            <button className="fab" data-edge-rail-item="record" type="button" onClick={() => openNewEntry()} aria-label={t("home.addRecord")}>
              <img src="/ui/diary/record-stamp.png" alt="" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {dateSwipeMotion.phase !== "idle" && (
        <>
          <div
            className="home-swipe-shadow"
            data-side={dateSwipeMotion.direction === "previous" ? "left" : "right"}
            aria-hidden="true"
          />
          <div
            className="home-swipe-date-card"
            data-direction={dateSwipeMotion.direction}
            aria-hidden="true"
          >
            <span>{dateSwipeMotion.targetLabel}</span>
          </div>
        </>
      )}

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
          onAddAttachment={addAttachment}
          onRemoveAttachment={removeAttachment}
          onDraftChange={setDraft}
          onSave={saveEntry}
          attachmentBusy={attachmentBusy}
          t={t}
          usesStructuredTemplate={usesStructuredTemplate}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" />{toast}</div>}
    </main>
  );
}
