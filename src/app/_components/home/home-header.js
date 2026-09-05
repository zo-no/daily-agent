"use client";

/**
 * @fileoverview 渲染首页导航、日期选择和记录视图切换。
 */

import { DateDisclosure } from "../../date-disclosure";
import { Icon } from "../../ui";
import Link from "next/link";

/** Render one compact domain-directory trigger inside the upper tools. */
export function RecordViewRailToggle({ viewMode, onViewModeChange, t }) {
  const nextMode = viewMode === "timeline" ? "grouped" : "timeline";
  const currentLabel = viewMode === "timeline" ? t("home.timeView") : t("home.categoryView");
  const nextLabel = nextMode === "timeline" ? t("home.timeView") : t("home.categoryView");
  return (
    <button
      className="icon-button home-record-view-toggle home-mode-toggle home-edge-rail-tool"
      data-edge-rail-item="record-view"
      data-view-mode={viewMode}
      type="button"
      aria-pressed={viewMode === "grouped"}
      aria-label={t("home.switchRecordView", { view: nextLabel })}
      title={`${currentLabel} → ${nextLabel}`}
      onClick={() => onViewModeChange(nextMode)}
    >
      <span className="home-record-view-icon" data-record-view-icon aria-hidden="true">
        <Icon name="structure" size={24} />
      </span>
    </button>
  );
}

/** Render Plan as the pressed state of one reversible workspace control. */
export function WorkspaceModeRailToggle({ dayPlanActive, onDayPlanChange, t }) {
  const currentLabel = dayPlanActive ? t("plan.dayPlan") : t("plan.viewRecords");
  const nextLabel = dayPlanActive ? t("plan.viewRecords") : t("plan.dayPlan");
  return (
    <button
      className="icon-button home-workspace-toggle home-mode-toggle home-edge-rail-tool"
      data-edge-rail-item="workspace"
      data-workspace-mode={dayPlanActive ? "plan" : "diary"}
      type="button"
      aria-pressed={dayPlanActive}
      aria-label={t("home.switchWorkspace", { view: nextLabel })}
      title={`${currentLabel} → ${nextLabel}`}
      onClick={() => onDayPlanChange(!dayPlanActive)}
    >
      <span
        className="home-record-view-icon home-workspace-view-icon"
        data-workspace-icon
        data-workspace-target={dayPlanActive ? "diary" : "plan"}
        aria-hidden="true"
      >
        <Icon name="plan" size={24} />
      </span>
    </button>
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
  onReturnToToday,
  onSearch,
  onSettings,
  onDayPlanChange,
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
        <HomeDateNavigation
          calendarOpen={calendarOpen}
          locale={locale}
          selectedDate={selectedDate}
          showReturnToToday={Boolean(onReturnToToday)}
          triggerRef={triggerRef}
          onCalendarToggle={onCalendarToggle}
          onReturnToToday={onReturnToToday}
          t={t}
        />
      </div>
      <div className="top-actions home-edge-rail-tools">
        <Link className="home-insights-header-link" href="/insights" aria-label={t("home.openInsights")}>
          <img src="/ui/diary/rail-insights.png" alt="" aria-hidden="true" />
          <span>{t("home.openInsights")}</span>
        </Link>
        <button className={`icon-button home-search-button home-edge-rail-tool${searchOpen ? " is-active" : ""}`} data-edge-rail-item="search" type="button" ref={searchTriggerRef} onClick={onSearch} aria-label={t("common.search")} aria-expanded={searchOpen} title={`${t("common.search")} · ⌘/Ctrl+K`}>
          <span className="home-edge-rail-icon" aria-hidden="true">
            <img src="/ui/diary/rail-search.png" alt="" />
          </span>
        </button>
        <button className={`icon-button home-settings-button home-edge-rail-tool${settingsOpen ? " is-active" : ""}`} data-edge-rail-item="settings" type="button" ref={settingsTriggerRef} onClick={onSettings} aria-label={t("home.settings")} aria-expanded={settingsOpen}>
          <span className="home-edge-rail-icon" aria-hidden="true">
            <img src="/ui/diary/rail-settings.png" alt="" />
          </span>
        </button>
        <WorkspaceModeRailToggle dayPlanActive={dayPlanActive} onDayPlanChange={onDayPlanChange} t={t} />
        {!dayPlanActive && <RecordViewRailToggle viewMode={viewMode} onViewModeChange={onViewModeChange} t={t} />}
      </div>
    </header>
  );
}

/** Render one shared date navigator above both records and day planning. */
export function HomeDateNavigation({
  calendarOpen,
  locale,
  selectedDate,
  showReturnToToday = false,
  triggerRef,
  onCalendarToggle,
  onReturnToToday,
  t
}) {
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
      {showReturnToToday && (
        <button
          className="home-return-today"
          type="button"
          data-home-return-today
          aria-label={t("home.returnToday")}
          title={t("home.returnToday")}
          onClick={onReturnToToday}
        >
          {t("common.today")}
        </button>
      )}
    </div>
  );
}
