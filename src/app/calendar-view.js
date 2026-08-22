"use client";

/**
 * @fileoverview 在当前记录上下文中提供可展开日期选择器与本地日计划。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { buildCalendarMonth, calendarKeyboardTarget, shiftCalendarMonth } from "@/lib/calendar-model.mjs";
import { localDate } from "@/lib/data.mjs";
import {
  createPlanDraft,
  layoutPlanBlocks,
  planBlocksForDate,
  snapPlanMinutes,
  timeToMinutes
} from "@/lib/plan-model.mjs";
import { fullDateLabel } from "./date-label";
import { PlanEditor } from "./plan-editor";

const WEEKDAY_DATES = [7, 8, 9, 10, 11, 12, 13];
const DAY_START_MINUTES = 6 * 60;
const DAY_END_MINUTES = 24 * 60;
const HOUR_HEIGHT = 72;
const DAY_HOURS = Array.from({ length: 19 }, (_, index) => index + 6);

function monthLabel(year, month, locale) {
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "long" }).format(new Date(year, month, 1));
}

function monthTrackLabel(dateString, locale) {
  const [year, month] = dateString.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(new Date(year, month - 1, 1));
}

/** Shared open month grid used by the home context and single-day tools. */
export function CalendarMonthPicker({
  allDayPlans = [],
  entries = [],
  locale,
  onDateChange,
  onDaySelect,
  onMonthChange,
  planBlocks = [],
  selectedDate,
  t
}) {
  const weekStartsOn = locale === "zh-CN" ? 1 : 0;
  const month = useMemo(
    () => buildCalendarMonth(selectedDate, entries, weekStartsOn),
    [selectedDate, entries, weekStartsOn]
  );
  const planCountByDate = useMemo(() => {
    const counts = new Map();
    planBlocks.forEach((block) => counts.set(block.date, (counts.get(block.date) || 0) + 1));
    allDayPlans.forEach((block) => counts.set(block.date, (counts.get(block.date) || 0) + 1));
    return counts;
  }, [allDayPlans, planBlocks]);
  const monthOptions = useMemo(
    () => [-1, 0, 1].map((offset) => shiftCalendarMonth(selectedDate, offset)),
    [selectedDate]
  );
  const gridRef = useRef(null);
  const pendingFocusRef = useRef("");
  const weekdayIndexes = weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (!pendingFocusRef.current) return;
    gridRef.current?.querySelector(`[data-calendar-date="${pendingFocusRef.current}"]`)?.focus();
    pendingFocusRef.current = "";
  }, [selectedDate]);

  function selectDay(date) {
    (onDaySelect || onDateChange)(date);
  }

  function changeMonth(date) {
    (onMonthChange || onDateChange)(date);
  }

  function handleKeyboard(event, date) {
    const target = calendarKeyboardTarget(date, event.key, weekStartsOn);
    if (target === date) return;
    event.preventDefault();
    pendingFocusRef.current = target;
    selectDay(target);
  }

  return <>
    <div className="calendar-grid" role="grid" aria-label={monthLabel(month.year, month.month, locale)} ref={gridRef}>
      <div className="calendar-weekdays" role="row">
        {weekdayIndexes.map((weekday) => (
          <span role="columnheader" key={weekday}>{new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, WEEKDAY_DATES[weekday]))}</span>
        ))}
      </div>
      {month.weeks.map((week) => (
        <div className="calendar-week" role="row" key={week[0].date}>
          {week.map((cell) => {
            const label = fullDateLabel(cell.date, locale);
            const planCount = planCountByDate.get(cell.date) || 0;
            return (
              <div role="gridcell" aria-selected={cell.selected} key={cell.date}>
                <button
                  className={`calendar-day${cell.inMonth ? "" : " outside-month"}${cell.selected ? " selected" : ""}${cell.count ? " has-records" : ""}${planCount ? " has-plans" : ""}`}
                  type="button"
                  data-calendar-date={cell.date}
                  tabIndex={cell.selected ? 0 : -1}
                  aria-current={cell.today ? "date" : undefined}
                  aria-label={`${cell.count ? t("home.calendarDayRecords", { date: label, count: cell.count }) : t("home.calendarDayEmpty", { date: label })}${planCount ? `, ${t("plan.count", { count: planCount })}` : ""}`}
                  onClick={() => selectDay(cell.date)}
                  onKeyDown={(event) => handleKeyboard(event, cell.date)}
                >
                  <span className="calendar-day-number"><span>{cell.day}</span></span>
                  <span className="calendar-day-signals" aria-hidden="true">
                    {cell.count > 0 && <span className="calendar-record-signal" />}
                    {planCount > 0 && <span className="calendar-plan-signal" />}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      ))}
    </div>
    <nav className="calendar-month-track" aria-label={t("home.monthTrack")}>
      {monthOptions.map((date) => {
        const isCurrent = date.slice(0, 7) === selectedDate.slice(0, 7);
        return (
          <button
            className={isCurrent ? "active" : ""}
            type="button"
            key={date.slice(0, 7)}
            data-calendar-month={date.slice(0, 7)}
            aria-current={isCurrent ? "true" : undefined}
            aria-label={monthLabel(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, locale)}
            onClick={() => changeMonth(date)}
          >
            {monthTrackLabel(date, locale)}
          </button>
        );
      })}
    </nav>
  </>;
}

/** Renders an in-context date picker or the local day-plan workspace without owning persistence. */
export function CalendarView({ calendarMode, entries, planBlocks, allDayPlans = [], locale, selectedDate, onDateChange, onDeletePlan, onSavePlan, t }) {
  const [planDraft, setPlanDraft] = useState(null);
  const selectedPlans = useMemo(() => planBlocksForDate(planBlocks, selectedDate), [planBlocks, selectedDate]);
  const selectedAllDayPlans = useMemo(() => allDayPlans.filter((item) => item.date === selectedDate), [allDayPlans, selectedDate]);
  const planLayout = useMemo(() => layoutPlanBlocks(selectedPlans), [selectedPlans]);
  const dayScrollRef = useRef(null);

  useEffect(() => {
    if (calendarMode !== "day" || !dayScrollRef.current) return;
    const firstPlan = selectedPlans[0] ? timeToMinutes(selectedPlans[0].startTime) : null;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const target = selectedDate === localDate(now) ? currentMinutes : firstPlan;
    const visibleTarget = target === null ? 9 * 60 : target;
    dayScrollRef.current.scrollTop = Math.max(0, ((visibleTarget - DAY_START_MINUTES) / 60) * HOUR_HEIGHT - 120);
  }, [calendarMode, selectedDate, selectedPlans]);

  function openNewPlan(startMinutes = 9 * 60) {
    setPlanDraft(createPlanDraft(selectedDate, startMinutes));
  }

  function openPlanAtPointer(event) {
    const canvas = event.currentTarget;
    const offset = Math.max(0, Math.min(canvas.clientHeight, event.clientY - canvas.getBoundingClientRect().top));
    openNewPlan(snapPlanMinutes(DAY_START_MINUTES + (offset / HOUR_HEIGHT) * 60));
  }

  const now = new Date();
  const today = localDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const showCurrentTime = selectedDate === today && currentMinutes >= DAY_START_MINUTES && currentMinutes <= DAY_END_MINUTES;

  return (
    <section className={`calendar-view view-panel${calendarMode === "day" ? " day-mode" : " picker-mode"}`} aria-label={t(calendarMode === "day" ? "plan.dayGridLabel" : "home.calendarViewLabel")}>
      {calendarMode === "month" ? <CalendarMonthPicker
        allDayPlans={allDayPlans}
        entries={entries}
        locale={locale}
        onDateChange={onDateChange}
        planBlocks={planBlocks}
        selectedDate={selectedDate}
        t={t}
      /> : (
        <div className={`day-plan-shell${selectedAllDayPlans.length ? " has-all-day" : ""}`}>
          {selectedAllDayPlans.length > 0 && (
            <section className="day-plan-all-day" aria-label={t("plan.allDay")}>
              <span>{t("plan.allDay")}</span>
              <div>
                {selectedAllDayPlans.map((block) => (
                  <button type="button" key={block.id} onClick={() => setPlanDraft({ ...block })}>
                    <strong>{block.title}</strong><small>{t("plan.googleSource")}</small>
                  </button>
                ))}
              </div>
            </section>
          )}
          <div className="day-plan-scroll" ref={dayScrollRef}>
            <div className="day-plan-grid" style={{ height: `${(DAY_END_MINUTES - DAY_START_MINUTES) / 60 * HOUR_HEIGHT}px` }}>
              <div className="day-plan-hours" aria-hidden="true">
                {DAY_HOURS.map((hour) => <span key={hour} style={{ top: `${(hour - 6) * HOUR_HEIGHT}px` }}>{String(hour).padStart(2, "0")}:00</span>)}
              </div>
              <div className="day-plan-canvas" role="grid" aria-label={t("plan.dayGridLabel")} onClick={openPlanAtPointer}>
                {DAY_HOURS.map((hour) => <span className="day-plan-hour-line" aria-hidden="true" key={hour} style={{ top: `${(hour - 6) * HOUR_HEIGHT}px` }} />)}
                {planLayout.map(({ block, column, columns }) => {
                  const start = Math.max(DAY_START_MINUTES, timeToMinutes(block.startTime));
                  const end = Math.min(DAY_END_MINUTES, timeToMinutes(block.endTime));
                  if (end <= DAY_START_MINUTES || start >= DAY_END_MINUTES) return null;
                  const top = ((start - DAY_START_MINUTES) / 60) * HOUR_HEIGHT;
                  const height = Math.max(44, ((end - start) / 60) * HOUR_HEIGHT - 4);
                  return (
                    <button
                      className={`plan-block ${block.flexibility === "fixed" ? "fixed" : ""}${block.source === "google" ? " google" : ""}`}
                      type="button"
                      key={block.id}
                      onClick={(event) => { event.stopPropagation(); setPlanDraft({ ...block }); }}
                      style={{
                        top: `${top + 2}px`,
                        height: `${height}px`,
                        left: `calc(${column * (100 / columns)}% + ${column ? 3 : 0}px)`,
                        width: `calc(${100 / columns}% - 4px)`
                      }}
                    >
                      <strong>{block.title}</strong>
                      <span>{block.startTime}–{block.endTime}{block.source === "google" ? ` · ${t("plan.googleSource")}` : ""}</span>
                    </button>
                  );
                })}
                {showCurrentTime && <span className="day-plan-now" aria-label={t("plan.currentTime")} style={{ top: `${((currentMinutes - DAY_START_MINUTES) / 60) * HOUR_HEIGHT}px` }} />}
              </div>
            </div>
          </div>
          {!selectedPlans.length && !selectedAllDayPlans.length && <p className="day-plan-empty">{t("plan.empty")}</p>}
          <button className="day-plan-add" data-edge-rail-item="plan-add" type="button" onClick={() => openNewPlan(selectedDate === today ? currentMinutes : 9 * 60)} aria-label={t("plan.add")}>
            <img src="/ui/diary/plan-add-stamp.png" alt="" aria-hidden="true" />
          </button>
        </div>
      )}

      {planDraft && <PlanEditor
        initialDraft={planDraft}
        onClose={() => setPlanDraft(null)}
        onDelete={(block) => { if (onDeletePlan(block) !== false) setPlanDraft(null); }}
        onSave={onSavePlan}
        t={t}
      />}
    </section>
  );
}
