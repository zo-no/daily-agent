"use client";

/** User-chosen day, category analysis and reversible category application. */

import { useEffect, useMemo, useRef, useState } from "react";
import { localDate } from "@/lib/data.mjs";
import { dateParamOrFallback } from "@/lib/date-param.mjs";
import {
  applyOrganization,
  availableClassificationCategories,
  organizationSnapshot,
  organizeEntries,
  restoreOrganization
} from "@/modules/organize/classification/model.mjs";
import { createRemoteClassifierProvider } from "@/modules/organize/classification/client.mjs";
import { createRemoteDailyReviewProvider } from "@/modules/organize/daily-review/client.mjs";
import { useAuth } from "../auth-provider";
import { CalendarMonthPicker } from "../calendar-view";
import { DateDisclosure } from "../date-disclosure";
import { ManagementHeader } from "../management-header";
import { useI18n } from "../i18n";
import { Icon } from "../ui";
import { useLogNoteData, useToast } from "../use-log-note-data";
import { DailyReviewResults } from "./daily-review-results";

const delay = (duration) => new Promise((resolve) => setTimeout(resolve, duration));

function confidenceKey(group) {
  return group.confidence === "high" ? "organize.confidenceHigh" : "organize.confidenceMedium";
}

function reasonKey(reason) {
  if (reason === "ai-semantic") return "organize.reasonAi";
  if (reason === "category-name") return "organize.reasonCategoryName";
  if (reason === "category-keyword") return "organize.reasonKeyword";
  return "organize.reasonHistory";
}

export function OrganizeWorkspace() {
  const { locale, t } = useI18n();
  const { session } = useAuth();
  const [toast, setToast] = useToast();
  const { data, commitData, hydrated } = useLogNoteData(setToast, t("toast.loadFailed"), t("toast.saveFailed"));
  const [selectedDate, setSelectedDate] = useState(() => localDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [task, setTask] = useState("timeline");
  const [phase, setPhase] = useState("select");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [result, setResult] = useState(null);
  const [ignoredGroups, setIgnoredGroups] = useState(() => new Set());
  const [removedEntries, setRemovedEntries] = useState(() => new Set());
  const [undoSnapshot, setUndoSnapshot] = useState(null);
  const analysisRequestRef = useRef(0);
  const analysisAbortRef = useRef(null);
  const dateTriggerRef = useRef(null);
  const classificationProvider = useMemo(() => createRemoteClassifierProvider({
    getAccessToken: () => session?.access_token || ""
  }), [session?.access_token]);
  const reviewProvider = useMemo(() => createRemoteDailyReviewProvider({
    getAccessToken: () => session?.access_token || ""
  }), [session?.access_token]);

  const availableCategories = useMemo(() => availableClassificationCategories(data), [data]);
  const visibleEntries = useMemo(() => organizeEntries({ entries: data.entries, templates: data.templates, date: selectedDate }), [data.entries, data.templates, selectedDate]);
  const calendarEntries = useMemo(() => {
    const periodicTemplateIds = new Set(data.templates.filter((template) => template.recordType === "periodic").map((template) => template.id));
    return data.entries.filter((entry) => !periodicTemplateIds.has(entry.templateId));
  }, [data.entries, data.templates]);
  const entryMap = useMemo(() => new Map(data.entries.map((entry) => [entry.id, entry])), [data.entries]);
  const categoryMap = useMemo(() => new Map(availableCategories.map((category) => [category.id, category])), [availableCategories]);

  useEffect(() => () => analysisAbortRef.current?.abort(), []);

  useEffect(() => {
    const today = localDate();
    const requestedDate = new URLSearchParams(window.location.search).get("date");
    setSelectedDate(dateParamOrFallback(requestedDate, today));
  }, []);

  function categoryPath(categoryId) {
    const category = categoryMap.get(categoryId);
    return category ? `${category.domainName} / ${category.name}` : t("common.uncategorized");
  }

  function changeDate(nextDate, closeCalendar = false) {
    analysisAbortRef.current?.abort();
    analysisRequestRef.current += 1;
    setSelectedDate(nextDate);
    setPhase("select");
    setAnalysisStep(0);
    setResult(null);
    setIgnoredGroups(new Set());
    setRemovedEntries(new Set());
    if (closeCalendar) {
      setCalendarOpen(false);
      requestAnimationFrame(() => dateTriggerRef.current?.focus());
    }
  }

  function changeTask(nextTask) {
    if (nextTask === task) return;
    analysisAbortRef.current?.abort();
    analysisRequestRef.current += 1;
    setTask(nextTask);
    setPhase("select");
    setAnalysisStep(0);
    setResult(null);
    setIgnoredGroups(new Set());
    setRemovedEntries(new Set());
  }

  function commitCategory(entryIds, categoryId) {
    const category = categoryMap.get(categoryId);
    if (!category || !entryIds.length) return false;
    const snapshot = organizationSnapshot(data.entries, entryIds);
    const saved = commitData((state) => applyOrganization(state, entryIds.map((entryId) => ({ entryId, categoryId }))));
    if (!saved) return false;
    setUndoSnapshot(snapshot);
    setToast(t("organize.applied", { count: entryIds.length, category: categoryPath(categoryId) }));
    return true;
  }

  async function analyze() {
    if (!visibleEntries.length) return;
    analysisAbortRef.current?.abort();
    const controller = new AbortController();
    analysisAbortRef.current = controller;
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    setPhase("analyzing");
    setAnalysisStep(1);
    setResult(null);
    setIgnoredGroups(new Set());
    setRemovedEntries(new Set());
    await delay(240);
    if (analysisRequestRef.current !== requestId) return;
    setAnalysisStep(2);
    const nextResult = task === "timeline"
      ? await reviewProvider.analyze({ date: selectedDate, entries: visibleEntries, locale, signal: controller.signal })
      : await classificationProvider.analyze({ entries: visibleEntries, allEntries: data.entries, categories: availableCategories });
    await delay(240);
    if (analysisRequestRef.current !== requestId) return;
    setAnalysisStep(3);
    await delay(180);
    if (analysisRequestRef.current !== requestId) return;
    setResult(nextResult);
    setPhase("review");
    if (nextResult.fallbackReason && task === "classify") setToast(t("organize.aiFallback"));
  }

  function activeEntriesForGroup(group) {
    return group.entries.filter((item) => !removedEntries.has(`${group.id}:${item.entryId}`));
  }

  function applyGroup(group) {
    const entryIds = activeEntriesForGroup(group).map((item) => item.entryId);
    if (commitCategory(entryIds, group.categoryId)) setIgnoredGroups((current) => new Set(current).add(group.id));
  }

  function applyAll() {
    const changes = [];
    const affected = new Set();
    result.groups.forEach((group) => {
      if (ignoredGroups.has(group.id)) return;
      activeEntriesForGroup(group).forEach((item) => {
        changes.push({ entryId: item.entryId, categoryId: group.categoryId });
        affected.add(item.entryId);
      });
    });
    if (!changes.length) return;
    const snapshot = organizationSnapshot(data.entries, [...affected]);
    const saved = commitData((state) => applyOrganization(state, changes));
    if (!saved) return;
    setUndoSnapshot(snapshot);
    setIgnoredGroups(new Set(result.groups.map((group) => group.id)));
    setToast(t("organize.appliedAll", { count: affected.size }));
  }

  function undo() {
    if (!undoSnapshot) return;
    if (!commitData((state) => restoreOrganization(state, undoSnapshot))) return;
    setUndoSnapshot(null);
    setToast(t("organize.undone"));
  }

  const activeGroups = task === "classify" ? result?.groups.filter((group) => !ignoredGroups.has(group.id) && activeEntriesForGroup(group).length) || [] : [];
  const steps = task === "timeline" ? ["sort", "segment", "summarize"] : ["read", "analyze", "group"];

  if (!hydrated) return <main className="loading-screen"><span className="brand-mark">L</span><p>{t("organize.loading")}</p></main>;

  return (
    <main
      className="organize-page"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !calendarOpen) return;
        event.preventDefault();
        setCalendarOpen(false);
        requestAnimationFrame(() => dateTriggerRef.current?.focus());
      }}
    >
      <ManagementHeader backLabel={t("organize.back")} title={t("organize.title")} action={undoSnapshot ? <button className="organize-undo" type="button" onClick={undo}>{t("organize.undo")}</button> : null} />
      <div className={`organize-workspace phase-${phase}`}>
        <section className="organize-selection" aria-label={t("organize.selectionLabel")}>
          <div className="organize-date-context">
            <DateDisclosure
              className="organize-date-title"
              expanded={calendarOpen}
              locale={locale}
              selectedDate={selectedDate}
              triggerRef={dateTriggerRef}
              onToggle={() => setCalendarOpen((open) => !open)}
              openLabel={t("home.openCalendar")}
              closeLabel={t("home.closeCalendar")}
            />
            {calendarOpen && (
              <section className="calendar-view picker-mode organize-calendar" aria-label={t("home.calendarViewLabel")}>
                <CalendarMonthPicker
                  entries={calendarEntries}
                  locale={locale}
                  onDateChange={changeDate}
                  onDaySelect={(date) => changeDate(date, true)}
                  selectedDate={selectedDate}
                  t={t}
                />
              </section>
            )}
          </div>
          <div className="organize-list-heading"><strong>{t("organize.recordsForDay", { count: visibleEntries.length })}</strong></div>
          <div className="organize-record-list" key={selectedDate}>
            {visibleEntries.map((entry) => <article className="organize-record" key={entry.id}><span className="organize-record-meta"><time>{entry.time || "—"}</time><span>{categoryPath(entry.categoryId)}</span></span><span className="organize-record-content">{entry.content}</span></article>)}
            {!visibleEntries.length && <div className="organize-empty"><Icon name="inbox" /><p>{t("organize.noRecords")}</p></div>}
          </div>
          <div className="organize-task-switch" role="tablist" aria-label={t("review.taskLabel")}>
            <button type="button" role="tab" aria-selected={task === "timeline"} onClick={() => changeTask("timeline")}>{t("review.taskTimeline")}</button>
            <button type="button" role="tab" aria-selected={task === "classify"} onClick={() => changeTask("classify")}>{t("review.taskClassify")}</button>
          </div>
          <button className="organize-analyze-button" type="button" disabled={!visibleEntries.length} onClick={analyze}>{t(task === "timeline" ? "review.generate" : "organize.analyzeDay", { count: visibleEntries.length })}</button>
        </section>

        <section className="organize-analysis" aria-live="polite" aria-label={t(task === "timeline" ? "review.analysisLabel" : "organize.analysisLabel")}>
          <div className="organize-analysis-header"><h2>{t(task === "timeline" ? "review.title" : "organize.suggestions")}</h2>{phase === "review" && <button type="button" className="organize-recalculate" onClick={analyze}>{t("organize.recalculate")}</button>}</div>
          <ol className="organize-progress" aria-label={t("organize.progressLabel")}>{steps.map((step, index) => <li key={step} className={analysisStep > index ? "done" : analysisStep === index + 1 ? "active" : ""}><span>{analysisStep > index ? <Icon name="check" size={15} /> : index + 1}</span>{t(task === "timeline" ? `review.step.${step}` : `organize.step.${step}`)}</li>)}</ol>
          {phase === "select" && <div className="organize-analysis-empty"><span className="organize-orbit"><span /></span><h3>{t(task === "timeline" ? "review.readyTitle" : "organize.readyTitle")}</h3></div>}
          {phase === "analyzing" && <div className="organize-analysis-empty is-running"><span className="organize-spinner" /><h3>{t(task === "timeline" ? "review.runningTitle" : "organize.runningTitle")}</h3><p>{t(task === "timeline" ? "review.runningHint" : "organize.runningHint", { count: visibleEntries.length })}</p></div>}
          {phase === "review" && task === "timeline" && <div className="organize-results"><DailyReviewResults entryMap={entryMap} result={result} t={t} /><button className="organize-mobile-back" type="button" onClick={() => setPhase("select")}>{t("organize.backToDate")}</button></div>}
          {phase === "review" && task === "classify" && <div className="organize-results">
            {activeGroups.map((group) => <article className="organize-suggestion" key={group.id}><header><div><span className="organize-category">{categoryPath(group.categoryId)}</span><span className={`organize-confidence ${group.confidence}`}>{t(confidenceKey(group))}</span></div><button type="button" onClick={() => setIgnoredGroups((current) => new Set(current).add(group.id))}>{t("organize.ignore")}</button></header><p>{t("organize.groupReason", { count: activeEntriesForGroup(group).length, category: categoryPath(group.categoryId) })}</p><ul>{activeEntriesForGroup(group).map((item) => { const entry = entryMap.get(item.entryId); return <li key={item.entryId}><div><span>{entry?.content}</span><small>{t(reasonKey(item.reason))}</small></div><button type="button" aria-label={t("organize.removeEntry")} onClick={() => setRemovedEntries((current) => new Set(current).add(`${group.id}:${item.entryId}`))}><Icon name="close" size={16} /></button></li>; })}</ul><button className="organize-apply-group" type="button" onClick={() => applyGroup(group)}>{t("organize.applyGroup", { category: categoryPath(group.categoryId) })}</button></article>)}
            {!!result?.unmatchedEntryIds.length && !!activeGroups.length && <p className="organize-unmatched">{t("organize.unmatched", { count: result.unmatchedEntryIds.length })}</p>}
            {!activeGroups.length && <div className="organize-analysis-empty compact"><Icon name="inbox" size={26} /><h3>{t("organize.noSuggestions")}</h3><p>{t("organize.noSuggestionsHint", { count: result?.unmatchedEntryIds.length || 0 })}</p></div>}
            {!!activeGroups.length && <button className="organize-apply-all" type="button" onClick={applyAll}>{t("organize.applyAll")}</button>}
            <button className="organize-mobile-back" type="button" onClick={() => setPhase("select")}>{t("organize.backToDate")}</button>
          </div>}
        </section>
      </div>
      {toast && <div className="toast" role="status" aria-live="polite"><Icon name="check" />{toast}</div>}
    </main>
  );
}
