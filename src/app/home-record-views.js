"use client";

/**
 * @fileoverview 渲染首页时间线、分类分组、内联日期选择器和日计划表面。
 */

import { localizeCategoryName, localizeDomainName } from "@/lib/i18n.mjs";
import { AttachmentGallery } from "./attachment-image";
import { CalendarView } from "./calendar-view";
import { FixedRecords } from "./fixed-records";
import { MarkdownContent } from "./markdown-content";
import { RecordTagList } from "./record-label";

/** 根据当前视图只渲染记录内容，不拥有记录或计划写入状态。 */
export function HomeRecordViews({
  allDayPlans,
  calendarTriggerRef,
  calendarOpen,
  categoryGroups,
  categoryMap,
  dayPlanActive,
  domainMap,
  entries,
  locale,
  onCalendarOpenChange,
  onDateChange,
  onDeletePlan,
  onOpenEntry,
  onSaveFixed,
  onSavePlan,
  registerRailSection,
  planBlocks,
  selectedDate,
  t,
  timelineEntries,
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
        planBlocks={planBlocks}
        allDayPlans={allDayPlans}
        locale={locale}
        selectedDate={selectedDate}
        onDateChange={onDateChange}
        onDeletePlan={onDeletePlan}
        onSavePlan={onSavePlan}
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
            <button className="entry" type="button" key={entry.id} onClick={() => onOpenEntry(entry)}>
              <time>{entry.time || "—"}</time>
              <span className="entry-body">
                <span className="visually-hidden">
                  {localizeDomainName(domainMap.get(categoryMap.get(entry.categoryId)?.domainId), locale)} · {localizeCategoryName(categoryMap.get(entry.categoryId), locale)}
                </span>
                <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                <AttachmentGallery attachments={entry.attachments} t={t} />
                <RecordTagList className="entry-tags" tags={entry.tags} />
              </span>
            </button>
          ))}
        </div>
      </section>
    );
  } else if (viewMode === "grouped") {
    activeContent = (
      <section className="grouped-view view-panel" aria-live="polite" aria-label={t("home.categoryViewLabel")}>
        {categoryGroups.map((domain) => (
          <section
            className="record-domain"
            data-domain-id={domain.id}
            id={`record-domain-${domain.id}`}
            key={domain.id}
            aria-labelledby={`record-domain-heading-${domain.id}`}
          >
            <header className="record-domain-header">
              <div className="record-heading-cluster">
                <h2 id={`record-domain-heading-${domain.id}`} data-rail-anchor ref={(node) => registerRailSection?.(`grouped:domain:${domain.id}`, node)}>{domain.name}</h2>
              </div>
            </header>
            {domain.categories.map((category) => (
              <section className="record-category" key={category.id}>
                <header className="record-category-header">
                  <div className="record-heading-cluster">
                    <h3>{category.name}</h3>
                    {!!category.periodicItems.length && (
                      <span aria-label={t("home.periodicCategoryProgressLabel", { completed: category.periodicCompletedCount, total: category.periodicItems.length })}>
                        {t("home.periodicCategoryProgress", { completed: category.periodicCompletedCount, total: category.periodicItems.length })}
                      </span>
                    )}
                  </div>
                </header>
                <div className="record-group-list">
                  {category.entries.map((entry) => (
                    <button className="group-entry" type="button" key={entry.id} onClick={() => onOpenEntry(entry)}>
                      <time>{entry.time}</time>
                      <span className="group-entry-body">
                        <span className="entry-content"><MarkdownContent content={entry.content} /></span>
                        <AttachmentGallery attachments={entry.attachments} t={t} />
                        <RecordTagList className="group-entry-meta" tags={entry.tags} />
                      </span>
                    </button>
                  ))}
                  {!!category.periodicItems.length && <FixedRecords items={category.periodicItems} onSave={onSaveFixed} t={t} embedded />}
                </div>
              </section>
            ))}
          </section>
        ))}
        {!categoryGroups.length && <div className="timeline-empty">{t("home.noRecords")}</div>}
      </section>
    );
  }

  return <>{sharedDateContext}{activeContent}</>;
}
