"use client";

/**
 * @fileoverview 渲染首页导航、日期选择和记录视图切换。
 */

import { DateIdentity } from "./date-disclosure";

/** Render record-only browsing modes as the page's editorial title. */
export function RecordViewSwitch({ viewMode, onViewModeChange, t }) {
  return (
    <div className="home-view-title" role="group" aria-label={t("home.viewMode")}>
      <button className="home-view-option" data-view-mode="timeline" type="button" aria-pressed={viewMode === "timeline"} onClick={() => onViewModeChange("timeline")}>{t("home.timeView")}</button>
      <span aria-hidden="true">/</span>
      <button className="home-view-option" data-view-mode="grouped" type="button" aria-pressed={viewMode === "grouped"} onClick={() => onViewModeChange("grouped")}>{t("home.categoryView")}</button>
    </div>
  );
}

/** Render the diary/plan workspace choice close to the contextual actions. */
export function WorkspaceModeSwitch({ dayPlanActive, onDayPlanChange, t }) {
  return (
    <div className="view-switch workspace-mode-switch" data-edge-rail-item="workspace" role="group" aria-label={t("home.workspaceMode")}>
      <button className={!dayPlanActive ? "active" : ""} type="button" aria-pressed={!dayPlanActive} onClick={() => onDayPlanChange(false)}>{t("plan.viewRecords")}</button>
      <button className={dayPlanActive ? "active" : ""} type="button" aria-pressed={dayPlanActive} onClick={() => onDayPlanChange(true)}>{t("plan.dayPlan")}</button>
    </div>
  );
}

/** Render app-level navigation and the one shared responsive date identity. */
export function HomeHeader({
  calendarOpen,
  dayPlanActive,
  locale,
  selectedDate,
  searchOpen,
  settingsOpen,
  searchTriggerRef,
  settingsTriggerRef,
  triggerRef,
  viewMode,
  onCalendarToggle,
  onSearch,
  onSettings,
  onViewModeChange,
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
        requestAnimationFrame(() => triggerRef.current?.focus({ preventScroll: true }));
      }}
    >
      <div className="home-title-cluster">
        {dayPlanActive
          ? <div className="home-plan-title">{t("plan.dayPlan")}</div>
          : <RecordViewSwitch viewMode={viewMode} onViewModeChange={onViewModeChange} t={t} />}
        <HomeDateNavigation
          locale={locale}
          selectedDate={selectedDate}
        />
      </div>
      <div className="top-actions home-edge-rail-tools">
        <button className={`icon-button home-search-button home-edge-rail-tool${searchOpen ? " is-active" : ""}`} data-edge-rail-item="search" type="button" ref={searchTriggerRef} onClick={onSearch} aria-label={t("common.search")} aria-expanded={searchOpen} title={`${t("common.search")} · ⌘/Ctrl+K`}>
          <span className="home-edge-rail-hole" aria-hidden="true">
            <img className="home-edge-rail-hole-idle" src="/ui/diary/rail-node-idle-fine.png" alt="" />
            <img className="home-edge-rail-hole-active" src="/ui/diary/rail-node-active-fine.png" alt="" />
          </span>
          <span className="home-edge-rail-label" aria-hidden="true">{t("home.searchRailLabel")}</span>
        </button>
        <button
          className={`icon-button home-calendar-button home-edge-rail-tool${calendarOpen ? " is-active" : ""}`}
          data-edge-rail-item="calendar"
          type="button"
          ref={triggerRef}
          aria-label={calendarOpen ? t("home.closeCalendar") : t("home.openCalendar")}
          aria-expanded={calendarOpen}
          aria-controls="home-calendar-context"
          onClick={onCalendarToggle}
        >
          <span className="home-edge-rail-hole" aria-hidden="true">
            <img className="home-edge-rail-hole-idle" src="/ui/diary/rail-node-idle-fine.png" alt="" />
            <img className="home-edge-rail-hole-active" src="/ui/diary/rail-node-active-fine.png" alt="" />
          </span>
          <span className="home-edge-rail-label" aria-hidden="true">{t("home.calendarRailLabel")}</span>
        </button>
        <button className={`icon-button home-settings-button home-edge-rail-tool${settingsOpen ? " is-active" : ""}`} data-edge-rail-item="settings" type="button" ref={settingsTriggerRef} onClick={onSettings} aria-label={t("home.settings")} aria-expanded={settingsOpen}>
          <span className="home-edge-rail-hole" aria-hidden="true">
            <img className="home-edge-rail-hole-idle" src="/ui/diary/rail-node-idle-fine.png" alt="" />
            <img className="home-edge-rail-hole-active" src="/ui/diary/rail-node-active-fine.png" alt="" />
          </span>
          <span className="home-edge-rail-label" aria-hidden="true">{t("home.settingsRailLabel")}</span>
        </button>
      </div>
    </header>
  );
}

/** Render one shared date navigator above both records and day planning. */
export function HomeDateNavigation({ locale, selectedDate }) {
  return (
    <div className="date-context-navigation">
      <DateIdentity
        as="h1"
        className="home-date-title"
        locale={locale}
        selectedDate={selectedDate}
      />
    </div>
  );
}
