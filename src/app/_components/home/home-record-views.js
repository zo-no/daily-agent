"use client";

/**
 * @fileoverview 渲染首页时间线、分类分组、内联日期选择器和日计划表面。
 */

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { localTimeWithSeconds } from "@/lib/data.mjs";
import { localizeCategoryName, localizeDomainName } from "@/lib/i18n.mjs";
import { AttachmentGallery } from "../../attachment-image";
import { CalendarView } from "../../calendar-view";
import { FixedRecords } from "../../fixed-records";
import { MarkdownContent } from "../../markdown-content";
import { RecordTagList } from "../../record-label";

function InlineRecordQuickEditor({ draft, onCancel, onChange, onSave, t }) {
  const inputRef = useRef(null);
  const cancelledRef = useRef(false);
  const savingRef = useRef(false);

  function fitInput(input, preferredHeight = null) {
    input.style.height = "auto";
    input.style.paddingTop = "0px";
    input.style.paddingBottom = "0px";
    const naturalHeight = Math.max(44, input.scrollHeight);
    const singleLine = naturalHeight <= 44.5;
    input.style.paddingTop = singleLine ? "9px" : "0px";
    input.style.paddingBottom = singleLine ? "9px" : "0px";
    input.style.height = `${preferredHeight ?? naturalHeight}px`;
  }

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    fitInput(input, Math.max(44, Number(draft.initialControlHeight) || 44));
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);
  }, [draft.id]);

  async function saveOnBlur() {
    if (cancelledRef.current || savingRef.current) return;
    savingRef.current = true;
    const saved = await onSave(draft.id, draft.content);
    savingRef.current = false;
    if (!saved) window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  return (
    <textarea
      className="entry-inline-textarea"
      data-entry-inline-input
      ref={inputRef}
      rows={1}
      value={draft.content}
      aria-label={t("entry.quickEditField")}
      onBlur={saveOnBlur}
      onChange={(event) => {
        onChange(draft.id, event.target.value);
        fitInput(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          cancelledRef.current = true;
          onCancel(draft.id);
        } else if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

/** A quiet, second-precision quick-add row that owns no persistence itself. */
export function InlineQuickRecord({ categoryId = "", domainId = "", onSave, t }) {
  const [content, setContent] = useState("");
  const [time, setTime] = useState(() => localTimeWithSeconds());
  const [focused, setFocused] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const skipBlurRef = useRef(false);

  useEffect(() => {
    if (focused || saving) return undefined;
    setTime(localTimeWithSeconds());
    const timer = window.setInterval(() => setTime(localTimeWithSeconds()), 1000);
    return () => window.clearInterval(timer);
  }, [focused, saving]);

  async function saveDraft() {
    if (skipBlurRef.current) {
      skipBlurRef.current = false;
      return;
    }
    const nextContent = content.trim();
    if (!nextContent || saving) {
      setFocused(false);
      return;
    }
    setSaving(true);
    const saved = await onSave({ content: nextContent, time, categoryId });
    setSaving(false);
    if (saved) {
      setContent("");
      setTime(localTimeWithSeconds());
      setFocused(false);
      return;
    }
    setFocused(true);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  function refreshTime() {
    setTime(localTimeWithSeconds());
    setFocused(true);
    window.requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
  }

  return (
    <div
      className={`inline-quick-record${focused ? " is-focused" : ""}`}
      data-inline-quick-record
      data-inline-quick-record-domain={domainId || undefined}
    >
      <button
        className="inline-quick-record-time"
        data-inline-quick-record-time
        type="button"
        aria-label={t("home.quickRecordRefreshTime", { time })}
        onPointerDown={(event) => event.preventDefault()}
        onClick={refreshTime}
      >
        <span aria-hidden="true">{time}</span>
      </button>
      <input
        ref={inputRef}
        className="inline-quick-record-input"
        data-inline-quick-record-input
        type="text"
        inputMode="text"
        autoComplete="off"
        value={content}
        disabled={saving}
        placeholder={t("home.addRecordInline")}
        aria-label={t("home.quickRecordInput")}
        onFocus={() => setFocused(true)}
        onBlur={saveDraft}
        onChange={(event) => setContent(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            event.currentTarget.blur();
          } else if (event.key === "Escape") {
            event.preventDefault();
            skipBlurRef.current = true;
            setContent("");
            setFocused(false);
            setTime(localTimeWithSeconds());
            event.currentTarget.blur();
          }
        }}
      />
    </div>
  );
}

/** Owns the one date-to-content transition shared by Time, Category, and Plan. */
function HomeDateContentFrame({
  calendarOpen,
  calendarTriggerRef,
  datePicker,
  onCalendarOpenChange,
  children
}) {
  return (
    <>
      <section
        id="home-calendar-context"
        className={`shared-date-context${calendarOpen ? " is-calendar-open" : ""}`}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !calendarOpen) return;
          event.preventDefault();
          event.stopPropagation();
          onCalendarOpenChange(false);
          requestAnimationFrame(() => calendarTriggerRef.current?.focus({ preventScroll: true }));
        }}
      >
        {datePicker}
      </section>
      <div
        className={`home-date-content-frame${calendarOpen ? " is-calendar-open" : ""}`}
        data-home-date-content-frame
      >
        {children}
      </div>
    </>
  );
}

/** 根据当前视图只渲染记录内容，不拥有记录或计划写入状态。 */
export function HomeRecordViews({
  allDayPlans,
  activeAgentEntryId,
  activeAgentKind,
  activeDraftId,
  clarificationEntryIds,
  clarificationSourceIdForEntry,
  clarificationPlanIds,
  clarificationSourceIdForPlan,
  quickEditDraft,
  quickEditableEntryIds,
  agentReviewPanel,
  activePlanAgentId,
  planAgentReviewPanel,
  planAgentReviewKey,
  planAgentStatus,
  planAgentIntro,
  calendarTriggerRef,
  calendarOpen,
  categoryGroups,
  categoryMap,
  dayPlanActive,
  domainMap,
  entries,
  googleCalendarSupported,
  locale,
  onCalendarOpenChange,
  onDateChange,
  onDeletePlan,
  onOpenEntry,
  onOpenQuickEdit,
  onOpenEntryTime,
  onSaveQuickEdit,
  onCancelQuickEdit,
  onOpenClarification,
  onChangeQuickEdit,
  onSaveFixed,
  onSaveQuickRecord,
  onSavePlan,
  onPlanAgentStart,
  onPlanAgentStop,
  onPlanAgentRestart,
  onPlanEditorOpen,
  planCreateRequest,
  onPlanCreateRequestHandled,
  registerRailSection,
  planBlocks,
  selectedDate,
  showDomainQuickRecords,
  t,
  timelineEntries,
  inlineEditor,
  viewMode
}) {
  const datePicker = calendarOpen ? (
    <CalendarView
      calendarMode="month"
      entries={entries}
      planBlocks={planBlocks}
      allDayPlans={allDayPlans}
      locale={locale}
      selectedDate={selectedDate}
      onDateChange={onDateChange}
      onDeletePlan={onDeletePlan}
      onSavePlan={onSavePlan}
      t={t}
    />
  ) : null;

  let activeContent = null;

  if (dayPlanActive) {
    activeContent = (
      <CalendarView
        calendarMode="day"
        entries={entries}
        googleCalendarSupported={googleCalendarSupported}
        planBlocks={planBlocks}
        allDayPlans={allDayPlans}
        locale={locale}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        onDeletePlan={onDeletePlan}
        onSavePlan={onSavePlan}
        activePlanAgentId={activePlanAgentId}
        agentReviewPanel={planAgentReviewPanel}
        agentReviewKey={planAgentReviewKey}
        agentStatus={planAgentStatus}
        clarificationPlanIds={clarificationPlanIds}
        clarificationSourceIdForPlan={clarificationSourceIdForPlan}
        agentIntro={planAgentIntro}
        onAgentStart={onPlanAgentStart}
        onAgentStop={onPlanAgentStop}
        onAgentRestart={onPlanAgentRestart}
        onOpenClarification={onOpenClarification}
        onPlanEditorOpen={onPlanEditorOpen}
        planCreateRequest={planCreateRequest}
        onPlanCreateRequestHandled={onPlanCreateRequestHandled}
        t={t}
      />
    );
  } else if (viewMode === "timeline" && timelineEntries.length) {
    activeContent = (
      <section id="timeline-records" className="timeline view-panel" aria-live="polite" aria-label={t("home.timelineView")}>
        <header className="timeline-header">
          <h2 id="timeline-records-heading" data-rail-anchor ref={(node) => registerRailSection?.("timeline:records", node)}>{t("common.record")}</h2>
          <Link className="timeline-record-setup-link" href="/settings#record-setup" aria-label={t("settings.recordSetupTitle")}>{t("home.adjustRecordStructure")}</Link>
        </header>
        <div className="timeline-list">
          {timelineEntries.map((entry) => (
            <Fragment key={entry.id}>
              <div
                className={`entry${activeAgentEntryId === entry.id ? " is-agent-active" : ""}${activeDraftId === entry.id ? " is-editing" : ""}${quickEditDraft?.id === entry.id ? " is-quick-editing" : ""}`}
                data-entry-id={entry.id}
                data-agent-kind={activeAgentEntryId === entry.id ? activeAgentKind : undefined}
                aria-current={activeAgentEntryId === entry.id ? "step" : undefined}
              >
                <div className="entry-time-cell">
                  <button
                    className="entry-time-button"
                    type="button"
                    data-entry-id={entry.id}
                    data-entry-time-action
                    aria-label={t("entry.editFromTime", { time: entry.time || t("entry.noTime") })}
                    onClick={() => onOpenEntryTime(entry)}
                  >
                    <time>{entry.time || "—"}</time>
                  </button>
                </div>
                {quickEditDraft?.id === entry.id ? (
                  <div className="entry-body entry-quick-edit-body">
                    <InlineRecordQuickEditor draft={quickEditDraft} onCancel={onCancelQuickEdit} onChange={onChangeQuickEdit} onSave={onSaveQuickEdit} t={t} />
                  </div>
                ) : activeDraftId === entry.id ? <div className="entry-body entry-editor-body">{inlineEditor}</div> : <div className="entry-body entry-content-row">
                  <button
                    className="entry-content-button"
                    type="button"
                    data-entry-content-action
                    data-entry-id={entry.id}
                    aria-label={t("entry.editContent", { content: entry.content.slice(0, 80) })}
                    onClick={(event) => quickEditableEntryIds.has(entry.id) ? onOpenQuickEdit(entry, event.currentTarget) : onOpenEntry(entry)}
                  >
                    <span className="visually-hidden">
                      {localizeDomainName(domainMap.get(categoryMap.get(entry.categoryId)?.domainId), locale)} · {localizeCategoryName(categoryMap.get(entry.categoryId), locale)}
                    </span>
                    <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                    <AttachmentGallery attachments={entry.attachments} t={t} />
                    <RecordTagList className="entry-tags" tags={entry.tags} />
                  </button>
                </div>}
                {clarificationEntryIds?.has(entry.id) && (
                  <button className="today-clarification-marker" type="button" data-clarification-entry-id={entry.id} aria-label={t("agent.clarificationMarker")} onClick={(event) => { event.stopPropagation(); onOpenClarification?.(clarificationSourceIdForEntry?.(entry.id), event.currentTarget); }}><span aria-hidden="true" /></button>
                )}
              </div>
              {activeAgentEntryId === entry.id && agentReviewPanel}
            </Fragment>
          ))}
        </div>
      </section>
    );
  } else if (viewMode === "grouped") {
    activeContent = (
      <section className="grouped-view view-panel" aria-live="polite" aria-label={t("home.categoryViewLabel")}>
        {categoryGroups.map((domain) => {
          const firstCategory = domain.categories[0];
          return (
            <section
              className="record-domain"
              data-domain-id={domain.id}
              id={`record-domain-${domain.id}`}
              key={domain.id}
              aria-labelledby={`record-domain-heading-${domain.id}`}
            >
              <header className="record-domain-header">
                <h2 id={`record-domain-heading-${domain.id}`} data-rail-anchor ref={(node) => registerRailSection?.(`grouped:domain:${domain.id}`, node)}>{domain.name}</h2>
              </header>
              {domain.categories.map((category) => (
                <section
                  className="record-category"
                  data-category-id={category.id}
                  key={category.id}
                  aria-labelledby={`record-category-heading-${category.id}`}
                >
                  <header className="record-category-header">
                    <div className="record-heading-cluster">
                      <h3 id={`record-category-heading-${category.id}`}>{category.name}</h3>
                      {!!category.periodicItems.length && (
                        <span
                          className="record-category-progress"
                          data-category-progress
                          aria-label={t("home.periodicCategoryProgressLabel", { completed: category.periodicCompletedCount, total: category.periodicItems.length })}
                        >
                          {t("home.periodicCategoryProgress", { completed: category.periodicCompletedCount, total: category.periodicItems.length })}
                        </span>
                      )}
                    </div>
                  </header>
                <div className="record-group-list">
                  {category.entries.map((entry) => (
                    <Fragment key={entry.id}>
                      <div
                        className={`group-entry${activeAgentEntryId === entry.id ? " is-agent-active" : ""}${activeDraftId === entry.id ? " is-editing" : ""}${quickEditDraft?.id === entry.id ? " is-quick-editing" : ""}`}
                        data-entry-id={entry.id}
                        data-agent-kind={activeAgentEntryId === entry.id ? activeAgentKind : undefined}
                        aria-current={activeAgentEntryId === entry.id ? "step" : undefined}
                      >
                        <div className="entry-time-cell">
                          <button
                            className="entry-time-button"
                            type="button"
                            data-entry-id={entry.id}
                            data-entry-time-action
                            aria-label={t("entry.editFromTime", { time: entry.time || t("entry.noTime") })}
                            onClick={() => onOpenEntryTime(entry)}
                          >
                            <time>{entry.time || "—"}</time>
                          </button>
                        </div>
                        {quickEditDraft?.id === entry.id ? (
                          <div className="group-entry-body entry-quick-edit-body">
                            <InlineRecordQuickEditor draft={quickEditDraft} onCancel={onCancelQuickEdit} onChange={onChangeQuickEdit} onSave={onSaveQuickEdit} t={t} />
                          </div>
                        ) : activeDraftId === entry.id ? <div className="group-entry-body entry-editor-body">{inlineEditor}</div> : <div className="group-entry-body entry-content-row">
                          <button
                            className="entry-content-button"
                            type="button"
                            data-entry-content-action
                            data-entry-id={entry.id}
                            aria-label={t("entry.editContent", { content: entry.content.slice(0, 80) })}
                            onClick={(event) => quickEditableEntryIds.has(entry.id) ? onOpenQuickEdit(entry, event.currentTarget) : onOpenEntry(entry)}
                          >
                            <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                            <AttachmentGallery attachments={entry.attachments} t={t} />
                            <RecordTagList className="group-entry-meta" tags={entry.tags} />
                          </button>
                        </div>}
                        {clarificationEntryIds?.has(entry.id) && (
                          <button className="today-clarification-marker" type="button" data-clarification-entry-id={entry.id} aria-label={t("agent.clarificationMarker")} onClick={(event) => { event.stopPropagation(); onOpenClarification?.(clarificationSourceIdForEntry?.(entry.id), event.currentTarget); }}><span aria-hidden="true" /></button>
                        )}
                      </div>
                      {activeAgentEntryId === entry.id && agentReviewPanel}
                    </Fragment>
                  ))}
                  {showDomainQuickRecords && firstCategory?.id === category.id && (
                    <InlineQuickRecord
                      key={`${selectedDate}:${domain.id}`}
                      categoryId={firstCategory.id}
                      domainId={domain.id}
                      onSave={onSaveQuickRecord}
                      t={t}
                    />
                  )}
                  {!!category.periodicItems.length && <FixedRecords items={category.periodicItems} onSave={onSaveFixed} t={t} embedded />}
                </div>
                </section>
              ))}
            </section>
          );
        })}
        {!categoryGroups.length && <div className="timeline-empty">{t("home.noRecords")}</div>}
      </section>
    );
  }

  return (
    <HomeDateContentFrame
      calendarOpen={calendarOpen}
      calendarTriggerRef={calendarTriggerRef}
      datePicker={datePicker}
      onCalendarOpenChange={onCalendarOpenChange}
    >
      {activeContent}
    </HomeDateContentFrame>
  );
}
