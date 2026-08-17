"use client";

/**
 * @fileoverview 渲染首页导航、日期选择和记录视图切换。
 */

import Link from "next/link";
import { localDate } from "@/lib/data.mjs";
import { DateDisclosure } from "./date-disclosure";
import { Icon } from "./ui";

/** Render record-only browsing modes in the shared upper context. */
export function RecordViewSwitch({ viewMode, onViewModeChange, t }) {
  return (
    <div className="content-mode-switch record-view-switch">
      <div className="record-view-options" role="group" aria-label={t("home.viewMode")}>
        <button className={viewMode === "timeline" ? "active" : ""} type="button" aria-pressed={viewMode === "timeline"} onClick={() => onViewModeChange("timeline")}>{t("home.timeView")}</button>
        <button className={viewMode === "grouped" ? "active" : ""} type="button" aria-pressed={viewMode === "grouped"} onClick={() => onViewModeChange("grouped")}>{t("home.categoryView")}</button>
      </div>
      <Link className="record-view-organize-link" href="/organize"><span>{t("organize.open")}</span></Link>
    </div>
  );
}

/** Render the diary/plan workspace choice close to the contextual actions. */
export function WorkspaceModeSwitch({ dayPlanActive, onDayPlanChange, t }) {
  return (
    <div className="view-switch workspace-mode-switch" role="group" aria-label={t("home.workspaceMode")}>
      <button className={!dayPlanActive ? "active" : ""} type="button" aria-pressed={!dayPlanActive} onClick={() => onDayPlanChange(false)}>{t("plan.viewRecords")}</button>
      <button className={dayPlanActive ? "active" : ""} type="button" aria-pressed={dayPlanActive} onClick={() => onDayPlanChange(true)}>{t("plan.dayPlan")}</button>
    </div>
  );
}

/** Render app-level navigation and the one shared responsive date identity. */
export function HomeHeader({
  calendarOpen,
  locale,
  selectedDate,
  triggerRef,
  onCalendarToggle,
  onDateChange,
  onLocaleChange,
  onSearch,
  t
}) {
  return (
    <header
      className="topbar"
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !calendarOpen) return;
        event.preventDefault();
        event.stopPropagation();
        onCalendarToggle();
        requestAnimationFrame(() => triggerRef.current?.focus());
      }}
    >
      <button className="brand" type="button" onClick={() => onDateChange(localDate())} aria-label={t("home.returnToday")}>
        <span className="brand-mark">L</span>
        <span>Log Note</span>
      </button>
      <HomeDateNavigation
        calendarOpen={calendarOpen}
        locale={locale}
        selectedDate={selectedDate}
        triggerRef={triggerRef}
        onCalendarToggle={onCalendarToggle}
        onDateChange={onDateChange}
        t={t}
      />
      <div className="topbar-controls">
        <button
          className="language-toggle"
          type="button"
          aria-label={locale === "en" ? t("settings.chinese") : t("settings.english")}
          onClick={() => onLocaleChange(locale === "en" ? "zh-CN" : "en")}
        >
          {locale === "en" ? "中" : "EN"}
        </button>
      </div>
      <div className="top-actions">
        <button className="icon-button search-wide" type="button" onClick={onSearch}>
          <Icon name="search" />
          <span>{t("common.search")}</span>
          <kbd>⌘ K</kbd>
        </button>
        <button className="icon-button mobile-search" type="button" onClick={onSearch} aria-label={t("common.search")}><Icon name="search" /></button>
        <Link className="icon-button" href="/templates" aria-label={t("common.templates")}><Icon name="book" /></Link>
        <Link className="icon-button" href="/settings" aria-label={t("home.settings")}><Icon name="settings" /></Link>
      </div>
    </header>
  );
}

/** Render one shared date navigator above both records and day planning. */
export function HomeDateNavigation({ calendarOpen, locale, selectedDate, triggerRef, onCalendarToggle, onDateChange, t }) {
  return (
    <div className="date-context-navigation">
      <DateDisclosure
        as="h1"
        className="home-date-title"
        expanded={calendarOpen}
        locale={locale}
        selectedDate={selectedDate}
        triggerRef={triggerRef}
        onToggle={onCalendarToggle}
        openLabel={t("home.openCalendar")}
        closeLabel={t("home.closeCalendar")}
      />
    </div>
  );
}
