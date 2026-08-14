"use client";

/**
 * @fileoverview 渲染首页导航、日期选择和记录视图切换。
 */

import Link from "next/link";
import { localDate, shiftDate } from "@/lib/data.mjs";
import { Icon } from "./ui";

function prettyDate(dateString, locale) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(new Date(year, month - 1, day));
}

/** Render navigation controls without owning record data. */
export function HomeHeader({ locale, selectedDate, viewMode, onDateChange, onSearch, onSettings, onViewModeChange, t }) {
  return (
    <>
      <header className="topbar">
        <button className="brand" type="button" onClick={() => onDateChange(localDate())} aria-label={t("home.returnToday")}>
          <span className="brand-mark">L</span>
          <span>Log Note</span>
        </button>
        <div className="top-actions">
          <button className="icon-button search-wide" type="button" onClick={onSearch}>
            <Icon name="search" />
            <span>{t("common.search")}</span>
            <kbd>⌘ K</kbd>
          </button>
          <button className="icon-button mobile-search" type="button" onClick={onSearch} aria-label={t("common.search")}><Icon name="search" /></button>
          <Link className="icon-button" href="/templates" aria-label={t("common.templates")}><Icon name="book" /></Link>
          <button className="icon-button" type="button" onClick={onSettings} aria-label={t("home.settings")}><Icon name="settings" /></button>
        </div>
      </header>

      <section className="day-header">
        <div className="date-navigation">
          <button className="icon-button subtle" type="button" onClick={() => onDateChange(shiftDate(selectedDate, -1))} aria-label={t("home.previousDay")}><Icon name="chevronLeft" /></button>
          <label className="date-picker">
            <span>{selectedDate === localDate() ? t("common.today") : selectedDate}</span>
            <input type="date" value={selectedDate} onChange={(event) => onDateChange(event.target.value)} />
          </label>
          <button className="icon-button subtle" type="button" onClick={() => onDateChange(shiftDate(selectedDate, 1))} aria-label={t("home.nextDay")}><Icon name="chevronRight" /></button>
        </div>
        <div className="day-title-row">
          <h1>{prettyDate(selectedDate, locale)}</h1>
          <div className="day-title-actions">
            {selectedDate !== localDate() && <button className="text-button" type="button" onClick={() => onDateChange(localDate())}>{t("home.backToday")}</button>}
            <div className="view-switch" role="group" aria-label={t("home.viewMode")}>
              <button className={viewMode === "timeline" ? "active" : ""} type="button" aria-pressed={viewMode === "timeline"} onClick={() => onViewModeChange("timeline")}>{t("home.timeView")}</button>
              <button className={viewMode === "grouped" ? "active" : ""} type="button" aria-pressed={viewMode === "grouped"} onClick={() => onViewModeChange("grouped")}>{t("home.categoryView")}</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
