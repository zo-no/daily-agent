"use client";

/**
 * @fileoverview 渲染首页时间线、分类分组、内联日期选择器和日计划表面。
 */

import { Fragment } from "react";
import { localizeCategoryName, localizeDomainName } from "@/lib/i18n.mjs";
import { AttachmentGallery } from "./attachment-image";
import { CalendarView } from "./calendar-view";
import { FixedRecords } from "./fixed-records";
import { MarkdownContent } from "./markdown-content";
import { RecordTagList } from "./record-label";
import { RecordTimeEditor } from "./record-time-editor";

/** 根据当前视图只渲染记录内容，不拥有记录或计划写入状态。 */
export function HomeRecordViews({
  allDayPlans,
  activeAgentEntryId,
  activeAgentKind,
  activeDraftId,
  activeTimeEntryId,
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
  onOpenEntryTime,
  onCloseEntryTime,
  onSaveEntryTime,
  onSaveFixed,
  onSavePlan,
  onPlanAgentStart,
  onPlanAgentStop,
  onPlanAgentRestart,
  onPlanEditorOpen,
  registerRailSection,
  planBlocks,
  selectedDate,
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

  const sharedDateContext = (
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
  );

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
        agentIntro={planAgentIntro}
        onAgentStart={onPlanAgentStart}
        onAgentStop={onPlanAgentStop}
        onAgentRestart={onPlanAgentRestart}
        onPlanEditorOpen={onPlanEditorOpen}
        t={t}
      />
    );
  } else if (viewMode === "timeline" && timelineEntries.length) {
    activeContent = (
      <section id="timeline-records" className="timeline view-panel" aria-live="polite" aria-label={t("home.timelineView")}>
        <header className="timeline-header">
          <h2 id="timeline-records-heading" data-rail-anchor ref={(node) => registerRailSection?.("timeline:records", node)}>{t("common.record")}</h2>
        </header>
        <div className="timeline-list">
          {timelineEntries.map((entry) => (
            <Fragment key={entry.id}>
              <div
                className={`entry${activeAgentEntryId === entry.id ? " is-agent-active" : ""}${activeDraftId === entry.id ? " is-editing" : ""}`}
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
                    aria-label={t("entry.adjustTime", { time: entry.time || t("entry.noTime") })}
                    aria-expanded={activeTimeEntryId === entry.id}
                    onClick={() => onOpenEntryTime(entry)}
                  >
                    <time>{entry.time || "—"}</time>
                  </button>
                  {activeTimeEntryId === entry.id && (
                    <RecordTimeEditor entry={entry} onClose={onCloseEntryTime} onSave={onSaveEntryTime} t={t} />
                  )}
                </div>
                {activeDraftId === entry.id ? <div className="entry-body entry-editor-body">{inlineEditor}</div> : <button
                  className="entry-body entry-content-button"
                  type="button"
                  data-entry-content-action
                  aria-label={t("entry.editContent", { content: entry.content.slice(0, 80) })}
                  onClick={() => onOpenEntry(entry)}
                >
                  <span className="visually-hidden">
                    {localizeDomainName(domainMap.get(categoryMap.get(entry.categoryId)?.domainId), locale)} · {localizeCategoryName(categoryMap.get(entry.categoryId), locale)}
                  </span>
                  <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                  <AttachmentGallery attachments={entry.attachments} t={t} />
                  <RecordTagList className="entry-tags" tags={entry.tags} />
                </button>}
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
                <div className="record-domain-chapter-line" data-domain-chapter-line>
                  <h2 id={`record-domain-heading-${domain.id}`} data-rail-anchor ref={(node) => registerRailSection?.(`grouped:domain:${domain.id}`, node)}>{domain.name}</h2>
                  {firstCategory && <>
                    <span className="record-domain-chapter-divider" aria-hidden="true">/</span>
                    <h3 className="record-domain-first-category" id={`record-category-heading-${firstCategory.id}`}>{firstCategory.name}</h3>
                    {!!firstCategory.periodicItems.length && (
                      <span
                        className="record-category-progress"
                        data-category-progress
                        aria-label={t("home.periodicCategoryProgressLabel", { completed: firstCategory.periodicCompletedCount, total: firstCategory.periodicItems.length })}
                      >
                        {t("home.periodicCategoryProgress", { completed: firstCategory.periodicCompletedCount, total: firstCategory.periodicItems.length })}
                      </span>
                    )}
                  </>}
                </div>
              </header>
              {domain.categories.map((category, categoryIndex) => (
                <section
                  className={`record-category${categoryIndex === 0 ? " is-chapter-category" : ""}`}
                  data-category-id={category.id}
                  key={category.id}
                  aria-labelledby={`record-category-heading-${category.id}`}
                >
                  {categoryIndex > 0 && <header className="record-category-header">
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
                  </header>}
                <div className="record-group-list">
                  {category.entries.map((entry) => (
                    <Fragment key={entry.id}>
                      <div
                        className={`group-entry${activeAgentEntryId === entry.id ? " is-agent-active" : ""}${activeDraftId === entry.id ? " is-editing" : ""}`}
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
                            aria-label={t("entry.adjustTime", { time: entry.time || t("entry.noTime") })}
                            aria-expanded={activeTimeEntryId === entry.id}
                            onClick={() => onOpenEntryTime(entry)}
                          >
                            <time>{entry.time || "—"}</time>
                          </button>
                          {activeTimeEntryId === entry.id && (
                            <RecordTimeEditor entry={entry} onClose={onCloseEntryTime} onSave={onSaveEntryTime} t={t} />
                          )}
                        </div>
                        {activeDraftId === entry.id ? <div className="group-entry-body entry-editor-body">{inlineEditor}</div> : <button
                          className="group-entry-body entry-content-button"
                          type="button"
                          data-entry-content-action
                          aria-label={t("entry.editContent", { content: entry.content.slice(0, 80) })}
                          onClick={() => onOpenEntry(entry)}
                        >
                          <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                          <AttachmentGallery attachments={entry.attachments} t={t} />
                          <RecordTagList className="group-entry-meta" tags={entry.tags} />
                        </button>}
                      </div>
                      {activeAgentEntryId === entry.id && agentReviewPanel}
                    </Fragment>
                  ))}
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

  return <>{sharedDateContext}{activeContent}</>;
}
